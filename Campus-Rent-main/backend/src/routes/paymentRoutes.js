import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import adminOnly from '../middleware/adminOnly.js';

const router = express.Router();

// ─── Borrower-facing payment routes ──────────────────────────────────────────

/**
 * POST /api/payments/initiate
 * Initiates a payment for a booking (creates RentalTransaction + YouPI session or mock).
 * Body: { bookingId }
 */
router.post('/initiate', requireAuth, paymentController.initiatePayment);

/**
 * GET /api/payments/booking/:bookingId
 * Get payment/transaction status for a booking (borrower or owner of that booking only).
 */
router.get('/booking/:bookingId', requireAuth, paymentController.getBookingPayment);

// ─── YouPI-PG Webhook (no auth — verified by HMAC) ───────────────────────────

/**
 * POST /api/payments/webhook/youpi
 * Receives YouPI-PG payment events. Signature verified server-side via HMAC.
 * Body is consumed as raw string before parsing (required for HMAC correctness).
 */
router.post(
  '/webhook/youpi',
  express.raw({ type: 'application/json' }),
  paymentController.youpiWebhook
);

// ─── Admin-only payment management routes ────────────────────────────────────

/**
 * GET /api/payments/admin/transactions
 * List all rental transactions with pagination.
 */
router.get('/admin/transactions', requireAuth, adminOnly, paymentController.listTransactions);

/**
 * GET /api/payments/admin/transactions/:transactionId
 * Get details of a specific transaction.
 */
router.get('/admin/transactions/:transactionId', requireAuth, adminOnly, paymentController.getTransaction);

/**
 * POST /api/payments/admin/transactions/:transactionId/confirm
 * Admin confirms payment (e.g. after manual verification for OBSERVED_SUCCESS).
 * Body: { note? }
 */
router.post('/admin/transactions/:transactionId/confirm', requireAuth, adminOnly, paymentController.confirmTransaction);

/**
 * POST /api/payments/admin/transactions/:transactionId/refund
 * Admin records a refund on the transaction.
 * Body: { refundAmountPaise: number, note: string }
 */
router.post('/admin/transactions/:transactionId/refund', requireAuth, adminOnly, paymentController.recordRefund);

/**
 * GET /api/payments/admin/payouts
 * List all pending owner payouts.
 */
router.get('/admin/payouts', requireAuth, adminOnly, paymentController.listPayouts);

/**
 * POST /api/payments/admin/payouts/:payoutId/mark-paid
 * Admin marks a payout as paid.
 * Body: { method: string, reference?: string, adminNote?: string }
 */
router.post('/admin/payouts/:payoutId/mark-paid', requireAuth, adminOnly, paymentController.markPayoutPaid);

export default router;
