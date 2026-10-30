/**
 * Campus 360 — Payment, Commission & Webhook Integration Tests
 */

import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  calculateCommission,
  toPaise,
  fromPaise,
  formatPaise,
  applyRefundToCommission,
  rentalDaysBetween,
} from '../src/utils/commission.js';
import {
  verifyWebhookSignatureV1,
  verifyWebhookSignatureV2,
  hashBody,
} from '../src/utils/youpi.js';

describe('Campus 360 Commission Calculations', () => {
  it('charges exactly 5% commission on gross rental amount (in paise)', () => {
    // 1000 INR = 100,000 paise. 5% = 5,000 paise (50 INR). Owner net = 95,000 paise (950 INR)
    const result = calculateCommission({
      dailyRentalRate: 1000,
      securityDeposit: 200,
      rentalDays: 1,
    });

    expect(result.grossRentalAmountPaise).toBe(100000);
    expect(result.securityDepositPaise).toBe(20000); // 200 INR excluded from commission base
    expect(result.commissionPaise).toBe(5000);
    expect(result.ownerNetPaise).toBe(95000);
    expect(result.commissionRateBps).toBe(500);
  });

  it('excludes security deposit from commission calculation', () => {
    const withoutDeposit = calculateCommission({
      dailyRentalRate: 500,
      securityDeposit: 0,
      rentalDays: 3,
    });
    const withDeposit = calculateCommission({
      dailyRentalRate: 500,
      securityDeposit: 5000,
      rentalDays: 3,
    });

    // Commission should be identical regardless of security deposit amount
    expect(withDeposit.commissionPaise).toBe(withoutDeposit.commissionPaise);
    expect(withDeposit.ownerNetPaise).toBe(withoutDeposit.ownerNetPaise);
    expect(withDeposit.grossRentalAmountPaise).toBe(150000); // 500 * 3 * 100
    expect(withDeposit.commissionPaise).toBe(7500); // 5% of 1500 INR = 75 INR
    expect(withDeposit.securityDepositPaise).toBe(500000);
  });

  it('handles multi-day rentals with date calculation', () => {
    const start = new Date('2026-09-01T10:00:00Z');
    const end = new Date('2026-09-05T10:00:00Z');
    const days = rentalDaysBetween(start, end);
    expect(days).toBe(4);

    const breakdown = calculateCommission({
      dailyRentalRate: 250,
      securityDeposit: 1000,
      rentalDays: days,
    });

    expect(breakdown.grossRentalAmountPaise).toBe(100000); // 250 * 4 = 1000 INR = 100,000 paise
    expect(breakdown.commissionPaise).toBe(5000); // 50 INR
    expect(breakdown.ownerNetPaise).toBe(95000); // 950 INR
  });

  it('adjusts commission and owner earnings on refunds consistently', () => {
    const gross = 100000; // 1000 INR
    const rateBps = 500;  // 5%

    // Partial refund of 400 INR (40,000 paise)
    const partial = applyRefundToCommission({
      grossRentalAmountPaise: gross,
      commissionRateBps: rateBps,
      refundAmountPaise: 40000,
    });

    // Remaining gross: 60,000 paise (600 INR)
    // 5% of 60,000 = 3,000 paise (30 INR)
    // Owner net = 60,000 - 3,000 = 57,000 paise (570 INR)
    expect(partial.adjustedCommissionPaise).toBe(3000);
    expect(partial.adjustedOwnerNetPaise).toBe(57000);

    // Full refund of 1000 INR
    const full = applyRefundToCommission({
      grossRentalAmountPaise: gross,
      commissionRateBps: rateBps,
      refundAmountPaise: 100000,
    });
    expect(full.adjustedCommissionPaise).toBe(0);
    expect(full.adjustedOwnerNetPaise).toBe(0);
  });
});

describe('YouPI-PG Webhook Signature & Replay Protection', () => {
  const secret = 'super-secret-campus360-key';

  it('verifies valid HMAC-SHA256 signature (V1)', () => {
    const payload = JSON.stringify({ event: 'OBSERVED_SUCCESS', paymentId: 'pay_123', amount: '100.00' });
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')}`;

    const isValid = verifyWebhookSignatureV1(payload, secret, signature);
    expect(isValid).toBe(true);
  });

  it('rejects tampered webhook payload (V1)', () => {
    const payload = JSON.stringify({ event: 'OBSERVED_SUCCESS', paymentId: 'pay_123', amount: '100.00' });
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')}`;

    const tampered = JSON.stringify({ event: 'OBSERVED_SUCCESS', paymentId: 'pay_123', amount: '1000.00' });
    const isValid = verifyWebhookSignatureV1(tampered, secret, signature);
    expect(isValid).toBe(false);
  });

  it('verifies timestamped V2 signature with freshness check', () => {
    const payload = JSON.stringify({ event: 'OBSERVED_SUCCESS', paymentId: 'pay_456' });
    const now = Date.now().toString();
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(`${now}.${payload}`, 'utf8').digest('hex')}`;

    const result = verifyWebhookSignatureV2(payload, secret, signature, now);
    expect(result.valid).toBe(true);
  });

  it('rejects stale replay attack in V2 (older than 5 minutes)', () => {
    const payload = JSON.stringify({ event: 'OBSERVED_SUCCESS', paymentId: 'pay_456' });
    const staleTime = (Date.now() - 6 * 60 * 1000).toString(); // 6 mins ago
    const signature = `sha256=${crypto.createHmac('sha256', secret).update(`${staleTime}.${payload}`, 'utf8').digest('hex')}`;

    const result = verifyWebhookSignatureV2(payload, secret, signature, staleTime);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Timestamp out of range');
  });

  it('generates consistent payload hashes for deduplication', () => {
    const body1 = JSON.stringify({ event: 'OBSERVED_SUCCESS', id: 1 });
    const body2 = JSON.stringify({ event: 'OBSERVED_SUCCESS', id: 1 });
    const body3 = JSON.stringify({ event: 'OBSERVED_SUCCESS', id: 2 });

    expect(hashBody(body1)).toBe(hashBody(body2));
    expect(hashBody(body1)).not.toBe(hashBody(body3));
  });
});

