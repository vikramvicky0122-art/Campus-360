/**
 * Campus 360 — Payment Service (Frontend)
 *
 * All commission calculation happens server-side.
 * The frontend only initiates payment and polls status —
 * it never submits an amount.
 */

import { api } from './api.js';

/**
 * Initiate payment for a booking.
 * Server recalculates commission; never trust client-submitted amounts.
 *
 * @param {string} bookingId
 * @returns {Promise<{ id, bookingId, paymentStatus, grossRentalAmountPaise, commissionPaise, ownerNetPaise, youpiCheckoutUrl }>}
 */
export async function initiatePayment(bookingId) {
  const result = await api.post('/payments/initiate', { bookingId });
  return result.data;
}

/**
 * Get the payment/transaction status for a booking.
 * @param {string} bookingId
 * @returns {Promise<object>}
 */
export async function getBookingPayment(bookingId) {
  const result = await api.get(`/payments/booking/${bookingId}`);
  return result.data;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

/**
 * Admin: List all rental transactions.
 * @param {{ page?: number, limit?: number, status?: string }} params
 */
export async function listTransactions({ page = 1, limit = 20, status } = {}) {
  const qs = new URLSearchParams({ page, limit, ...(status ? { status } : {}) }).toString();
  const result = await api.get(`/payments/admin/transactions?${qs}`);
  return result;
}

/**
 * Admin: Get a single transaction by ID.
 * @param {string} transactionId
 */
export async function getTransaction(transactionId) {
  const result = await api.get(`/payments/admin/transactions/${transactionId}`);
  return result.data;
}

/**
 * Admin: Confirm a payment transaction.
 * @param {string} transactionId
 * @param {string} [note]
 */
export async function confirmTransaction(transactionId, note) {
  const result = await api.post(`/payments/admin/transactions/${transactionId}/confirm`, { note });
  return result.data;
}

/**
 * Admin: Record a refund on a transaction.
 * @param {string} transactionId
 * @param {{ refundAmountPaise: number, note: string }} params
 */
export async function recordRefund(transactionId, { refundAmountPaise, note }) {
  const result = await api.post(`/payments/admin/transactions/${transactionId}/refund`, {
    refundAmountPaise,
    note,
  });
  return result.data;
}

/**
 * Admin: List pending/all owner payouts.
 * @param {{ page?: number, limit?: number, status?: string }} params
 */
export async function listPayouts({ page = 1, limit = 20, status } = {}) {
  const qs = new URLSearchParams({ page, limit, ...(status ? { status } : {}) }).toString();
  const result = await api.get(`/payments/admin/payouts?${qs}`);
  return result;
}

/**
 * Admin: Mark a payout as paid.
 * @param {string} payoutId
 * @param {{ method: string, reference?: string, adminNote?: string }} params
 */
export async function markPayoutPaid(payoutId, { method, reference, adminNote }) {
  const result = await api.post(`/payments/admin/payouts/${payoutId}/mark-paid`, {
    method,
    reference,
    adminNote,
  });
  return result.data;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Format integer paise as INR string for display.
 * @param {number} paise
 * @returns {string} e.g. "₹1,050.00"
 */
export function formatPaise(paise) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
}

/**
 * Map a paymentStatus string to a human-readable label and badge color.
 * @param {string} status
 * @returns {{ label: string, color: string }}
 */
export function paymentStatusInfo(status) {
  const map = {
    pending:          { label: 'Pending',                color: '#6b7280' },
    mock_paid:        { label: 'Paid (Mock/Dev)',        color: '#8b5cf6' },
    youpi_initiated:  { label: 'Payment Initiated',      color: '#f59e0b' },
    youpi_observed:   { label: 'Observed (Unverified)',  color: '#f97316' },
    confirmed:        { label: 'Confirmed',              color: '#10b981' },
    cancelled:        { label: 'Cancelled',              color: '#ef4444' },
    refunded_partial: { label: 'Partially Refunded',     color: '#f59e0b' },
    refunded_full:    { label: 'Fully Refunded',         color: '#6b7280' },
  };
  return map[status] || { label: status, color: '#6b7280' };
}
