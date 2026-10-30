/**
 * Campus 360 — YouPI-PG Webhook Tests
 * Tests run without a database — pure HMAC verification.
 */

import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  verifyWebhookSignatureV1,
  verifyWebhookSignatureV2,
  hashBody,
} from '../src/utils/youpi.js';

const TEST_SECRET = 'test_webhook_secret_campus360';

function makeHmacV1(body, secret) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`;
}

function makeHmacV2(body, secret, timestamp) {
  return `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex')}`;
}

// ─── verifyWebhookSignatureV1 ────────────────────────────────────────────────

describe('verifyWebhookSignatureV1', () => {
  const body = JSON.stringify({ event: 'OBSERVED_SUCCESS', paymentId: 'pay_abc', amountPaise: 100000 });

  it('accepts a valid signature', () => {
    const sig = makeHmacV1(body, TEST_SECRET);
    expect(verifyWebhookSignatureV1(body, TEST_SECRET, sig)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const sig = makeHmacV1(body, TEST_SECRET);
    const tamperedBody = body + ' ';
    expect(verifyWebhookSignatureV1(tamperedBody, TEST_SECRET, sig)).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const sig = makeHmacV1(body, 'different_secret');
    expect(verifyWebhookSignatureV1(body, TEST_SECRET, sig)).toBe(false);
  });

  it('accepts signature without sha256= prefix', () => {
    const sig = crypto.createHmac('sha256', TEST_SECRET).update(body, 'utf8').digest('hex');
    expect(verifyWebhookSignatureV1(body, TEST_SECRET, sig)).toBe(true);
  });

  it('returns false for empty parameters', () => {
    expect(verifyWebhookSignatureV1('', TEST_SECRET, makeHmacV1(body, TEST_SECRET))).toBe(false);
    expect(verifyWebhookSignatureV1(body, '', makeHmacV1(body, TEST_SECRET))).toBe(false);
    expect(verifyWebhookSignatureV1(body, TEST_SECRET, '')).toBe(false);
  });

  it('is safe against duplicate webhook replays — same signature always validates', () => {
    // V1 does not protect against replays (no timestamp). V2 does.
    const sig = makeHmacV1(body, TEST_SECRET);
    // Same body, same secret → same sig, both calls return true (replay is possible with V1)
    expect(verifyWebhookSignatureV1(body, TEST_SECRET, sig)).toBe(true);
    expect(verifyWebhookSignatureV1(body, TEST_SECRET, sig)).toBe(true);
  });
});

// ─── verifyWebhookSignatureV2 (timestamp-prefixed, preferred) ────────────────

describe('verifyWebhookSignatureV2', () => {
  const body = JSON.stringify({ event: 'OBSERVED_SUCCESS', paymentId: 'pay_xyz', amountPaise: 50000 });

  it('accepts a valid V2 signature with fresh timestamp', () => {
    const ts = Date.now().toString();
    const sig = makeHmacV2(body, TEST_SECRET, ts);
    const result = verifyWebhookSignatureV2(body, TEST_SECRET, sig, ts);
    expect(result.valid).toBe(true);
  });

  it('rejects a tampered body', () => {
    const ts = Date.now().toString();
    const sig = makeHmacV2(body, TEST_SECRET, ts);
    const result = verifyWebhookSignatureV2(body + '!', TEST_SECRET, sig, ts);
    expect(result.valid).toBe(false);
  });

  it('rejects a wrong secret', () => {
    const ts = Date.now().toString();
    const sig = makeHmacV2(body, 'wrong_secret', ts);
    const result = verifyWebhookSignatureV2(body, TEST_SECRET, sig, ts);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/mismatch/i);
  });

  it('rejects a stale timestamp (replay attack)', () => {
    const staleTs = (Date.now() - 10 * 60 * 1000).toString(); // 10 minutes old
    const sig = makeHmacV2(body, TEST_SECRET, staleTs);
    const result = verifyWebhookSignatureV2(body, TEST_SECRET, sig, staleTs, { maxAgeMs: 5 * 60 * 1000 });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/timestamp out of range/i);
  });

  it('rejects future timestamp (clock skew attack)', () => {
    const futureTs = (Date.now() + 10 * 60 * 1000).toString(); // 10 minutes in future
    const sig = makeHmacV2(body, TEST_SECRET, futureTs);
    const result = verifyWebhookSignatureV2(body, TEST_SECRET, sig, futureTs);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid timestamp', () => {
    const result = verifyWebhookSignatureV2(body, TEST_SECRET, 'sha256=abc', 'not_a_number');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/invalid timestamp/i);
  });

  it('returns false with missing parameters', () => {
    expect(verifyWebhookSignatureV2('', TEST_SECRET, 'sig', '12345').valid).toBe(false);
    expect(verifyWebhookSignatureV2(body, '', 'sig', '12345').valid).toBe(false);
  });

  it('accepts custom maxAgeMs window', () => {
    const ts = (Date.now() - 2 * 60 * 1000).toString(); // 2 minutes old
    const sig = makeHmacV2(body, TEST_SECRET, ts);
    // Should pass with a 10-minute window
    const pass = verifyWebhookSignatureV2(body, TEST_SECRET, sig, ts, { maxAgeMs: 10 * 60 * 1000 });
    expect(pass.valid).toBe(true);
    // Should fail with a 1-minute window
    const fail = verifyWebhookSignatureV2(body, TEST_SECRET, sig, ts, { maxAgeMs: 1 * 60 * 1000 });
    expect(fail.valid).toBe(false);
  });
});

// ─── hashBody (idempotency) ──────────────────────────────────────────────────

describe('hashBody', () => {
  it('produces a 64-char hex SHA-256 hash', () => {
    const hash = hashBody('{"event":"OBSERVED_SUCCESS"}');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('same body always produces same hash', () => {
    const body = '{"event":"OBSERVED_SUCCESS","paymentId":"abc"}';
    expect(hashBody(body)).toBe(hashBody(body));
  });

  it('different bodies produce different hashes', () => {
    expect(hashBody('{"a":1}')).not.toBe(hashBody('{"a":2}'));
  });

  it('is sensitive to whitespace differences', () => {
    expect(hashBody('{"a":1}')).not.toBe(hashBody('{"a": 1}'));
  });
});
