/**
 * Campus 360 — YouPI-PG Integration Layer
 *
 * IMPORTANT LIMITATIONS (confirmed from YouPI-PG source code):
 *  - YouPI-PG is experimental and NOT production-ready.
 *  - "SUCCESS" event = COD/counter payment only (NOT UPI bank settlement).
 *  - "OBSERVED_SUCCESS" = bank SMS alert detected, NOT bank-reconciled.
 *  - "RECONCILED" requires admin to import a bank statement CSV manually.
 *  - No refund API exists. Refunds must be managed manually by admin.
 *  - No automatic split settlements or marketplace payouts.
 *  - Do NOT fulfill orders on OBSERVED_SUCCESS alone.
 *
 * This integration is disabled by default (YOUPI_PG_ENABLED=false).
 * In development, use PAYMENT_MODE=mock to simulate payments without YouPI-PG.
 *
 * YouPI-PG webhook signature scheme (verified from source):
 *  - Header: X-Gateway-Signature: sha256=<HMAC-SHA256(rawBody, webhookSecret)>
 *  - Header: X-Gateway-Signature-V2: sha256=<HMAC-SHA256(`${timestamp}.${rawBody}`, webhookSecret)>
 *  - Header: X-Gateway-Timestamp: <unix_ms_as_string>
 *  - Verify with timing-safe compare.
 */

import crypto from 'node:crypto';

/** Feature flag — real-money YouPI-PG payments disabled by default */
export const YOUPI_PG_ENABLED = process.env.YOUPI_PG_ENABLED === 'true';

/** Development mock mode — simulates payment without any gateway */
export const PAYMENT_MODE = process.env.PAYMENT_MODE || 'mock'; // 'mock' | 'youpi'

/**
 * YouPI-PG webhook event statuses that indicate payment is observed (not fully reconciled).
 * Do NOT auto-confirm orders on these alone.
 */
export const YOUPI_OBSERVED_EVENTS = new Set(['OBSERVED_SUCCESS']);

/**
 * YouPI-PG events that indicate the session has terminated unsuccessfully.
 */
export const YOUPI_FAILED_EVENTS = new Set(['FAILED', 'EXPIRED', 'CANCELLED']);

// ─── Webhook HMAC Verification ───────────────────────────────────────────────

/**
 * Verify a YouPI-PG webhook signature (v1 — body only).
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param {string} rawBody - Raw request body string (must be the exact bytes, before any parsing)
 * @param {string} secret - YOUPI_WEBHOOK_SECRET from environment
 * @param {string} signatureHeader - Value of X-Gateway-Signature header (format: "sha256=<hex>")
 * @returns {boolean}
 */
export function verifyWebhookSignatureV1(rawBody, secret, signatureHeader) {
  if (!rawBody || !secret || !signatureHeader) return false;

  const expected = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;

  const actual = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

  const actualBuf   = Buffer.from(actual, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

/**
 * Verify a YouPI-PG webhook signature (v2 — timestamp-prefixed, preferred).
 * V2 format: HMAC-SHA256(`${timestamp}.${rawBody}`, secret)
 *
 * @param {string} rawBody
 * @param {string} secret
 * @param {string} signatureHeader - Value of X-Gateway-Signature-V2 header
 * @param {string} timestampHeader - Value of X-Gateway-Timestamp header
 * @param {{ maxAgeMs?: number }} [options] - maxAgeMs: reject webhooks older than this (default 5 min)
 * @returns {{ valid: boolean, reason?: string }}
 */
export function verifyWebhookSignatureV2(rawBody, secret, signatureHeader, timestampHeader, options = {}) {
  const { maxAgeMs = 5 * 60 * 1000 } = options;

  if (!rawBody || !secret || !signatureHeader || !timestampHeader) {
    return { valid: false, reason: 'Missing required parameters' };
  }

  // Timestamp replay protection
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) {
    return { valid: false, reason: 'Invalid timestamp' };
  }
  const age = Date.now() - ts;
  if (age < 0 || age > maxAgeMs) {
    return { valid: false, reason: `Timestamp out of range (age: ${age}ms, max: ${maxAgeMs}ms)` };
  }

  const expected = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader;

  const payload = `${timestampHeader}.${rawBody}`;
  const actual  = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');

  const actualBuf   = Buffer.from(actual, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');

  if (actualBuf.length !== expectedBuf.length) {
    return { valid: false, reason: 'Signature length mismatch' };
  }

  if (!crypto.timingSafeEqual(actualBuf, expectedBuf)) {
    return { valid: false, reason: 'Signature mismatch' };
  }

  return { valid: true };
}

/**
 * Compute SHA-256 hash of raw body for idempotency deduplication.
 * @param {string} rawBody
 * @returns {string} hex string
 */
export function hashBody(rawBody) {
  return crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
}

// ─── YouPI-PG API Client ─────────────────────────────────────────────────────

/**
 * Create a payment session via YouPI-PG.
 * Only call this when YOUPI_PG_ENABLED=true.
 *
 * @param {{
 *   orderId: string,
 *   amountPaise: number,
 *   bookingId: string,
 *   borrowerName: string,
 *   borrowerEmail: string,
 * }} params
 * @returns {Promise<{ paymentId: string, checkoutUrl: string, status: string }>}
 */
export async function createYoupiPayment({ orderId, amountPaise, bookingId, borrowerName, borrowerEmail }) {
  if (!YOUPI_PG_ENABLED) {
    throw new Error('YouPI-PG integration is disabled. Set YOUPI_PG_ENABLED=true to enable.');
  }

  const apiUrl = process.env.YOUPI_API_URL || 'http://localhost:6100';
  const merchantId = process.env.YOUPI_MERCHANT_ID;
  const apiKey = process.env.YOUPI_API_KEY || process.env.YOUPI_WEBHOOK_SECRET;

  // Amount in INR (YouPI-PG takes string INR, not paise)
  const amountInr = (amountPaise / 100).toFixed(2);

  const headers = { 'Content-Type': 'application/json' };
  if (merchantId) headers['X-Merchant-Id'] = merchantId;
  if (apiKey) headers['X-Merchant-Key'] = apiKey;
  headers['Idempotency-Key'] = `campus360-${bookingId}`;

  const payload = {
    orderId,
    amount: amountInr,
    currency: 'INR',
    customer: { name: borrowerName, email: borrowerEmail },
    metadata: { bookingId, platform: 'campus360' },
    returnUrl: process.env.YOUPI_RETURN_URL || `${process.env.FRONTEND_URL}/bookings`,
  };

  const res = await fetch(`${apiUrl}/api/v1/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YouPI-PG createPayment failed [HTTP ${res.status}]: ${errText}`);
  }

  const data = await res.json();
  return {
    paymentId:   data.paymentId,
    checkoutUrl: data.checkoutUrl,
    status:      data.status,
  };
}

/**
 * Query payment status from YouPI-PG.
 * @param {string} youpiPaymentId
 * @returns {Promise<{ status: string, method?: string, utr?: string }>}
 */
export async function getYoupiPaymentStatus(youpiPaymentId) {
  if (!YOUPI_PG_ENABLED) {
    throw new Error('YouPI-PG integration is disabled.');
  }

  const apiUrl = process.env.YOUPI_API_URL || 'http://localhost:6100';
  const res = await fetch(`${apiUrl}/api/v1/payments/${youpiPaymentId}`, {
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YouPI-PG getPaymentStatus failed [HTTP ${res.status}]: ${errText}`);
  }

  const data = await res.json();
  return {
    status: data.status,
    method: data.method,
    utr:    data.utr,
  };
}

// ─── Mock Payment (local dev) ─────────────────────────────────────────────────

/**
 * Simulate a successful payment in mock mode.
 * Returns a fake paymentId so the flow can be tested end-to-end.
 * @param {string} bookingId
 * @returns {{ paymentId: string, status: 'mock_paid' }}
 */
export function createMockPayment(bookingId) {
  return {
    paymentId:   `mock_${bookingId}_${Date.now()}`,
    checkoutUrl: null,
    status:      'mock_paid',
  };
}
