/**
 * Campus 360 — Payment Controller
 *
 * Handles payment initiation, YouPI-PG webhook processing (HMAC-verified),
 * and admin payment/payout management.
 *
 * Security guarantees:
 *  - Commission is always recalculated server-side — never from client data.
 *  - Webhook signatures are verified with timing-safe HMAC comparison.
 *  - Webhook idempotency is enforced via PaymentWebhookEvent unique constraint.
 *  - Admin routes are guarded by requireAuth + adminOnly middleware.
 *  - Borrower/owner routes verify the booking belongs to the requesting user.
 */

import prisma from '../utils/prismaClient.js';
import logger from '../utils/logger.js';
import {
  calculateCommission,
  rentalDaysBetween,
  applyRefundToCommission,
} from '../utils/commission.js';
import {
  YOUPI_PG_ENABLED,
  PAYMENT_MODE,
  YOUPI_OBSERVED_EVENTS,
  YOUPI_FAILED_EVENTS,
  verifyWebhookSignatureV1,
  verifyWebhookSignatureV2,
  hashBody,
  createYoupiPayment,
  createMockPayment,
} from '../utils/youpi.js';
import crypto from 'node:crypto';

// ─── Helper ───────────────────────────────────────────────────────────────────

function paymentResponse(transaction) {
  return {
    id:                     transaction.id,
    bookingId:              transaction.bookingId,
    paymentStatus:          transaction.paymentStatus,
    grossRentalAmountPaise: transaction.grossRentalAmountPaise,
    commissionPaise:        transaction.commissionPaise,
    ownerNetPaise:          transaction.ownerNetPaise,
    securityDepositPaise:   transaction.securityDepositPaise,
    refundedAmountPaise:    transaction.refundedAmountPaise,
    youpiPaymentId:         transaction.youpiPaymentId,
    youpiCheckoutUrl:       transaction.youpiCheckoutUrl,
    createdAt:              transaction.createdAt,
    updatedAt:              transaction.updatedAt,
  };
}

// ─── Initiate Payment ────────────────────────────────────────────────────────

/**
 * POST /api/payments/initiate
 * Creates a RentalTransaction with server-calculated commission, then either:
 *  - Starts a YouPI-PG session (if YOUPI_PG_ENABLED=true)
 *  - Creates a mock payment (PAYMENT_MODE=mock, default)
 */
export const initiatePayment = async (req, res, next) => {
  try {
    const { bookingId } = req.body || {};
    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'bookingId is required.' });
    }

    // Fetch booking with listing details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: true,
        borrower: { select: { id: true, fullName: true, collegeEmail: true } },
        transaction: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Only the borrower can initiate payment
    if (booking.borrowerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the borrower can initiate payment.' });
    }

    // Payment can only be initiated for approved bookings
    if (!['approved', 'item_given', 'ongoing'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be initiated for a booking with status '${booking.status}'.`,
      });
    }

    // Idempotency: if transaction already exists, return it
    if (booking.transaction) {
      const existing = booking.transaction;
      // If a YouPI session exists but checkout URL is needed, return it
      return res.status(200).json({
        success: true,
        data: paymentResponse(existing),
        message: 'Payment already initiated.',
      });
    }

    // ── Server-side commission calculation (never trust client amounts) ──
    const rentalDays = rentalDaysBetween(
      new Date(booking.startDate),
      new Date(booking.endDate)
    );
    const commissionData = calculateCommission({
      dailyRentalRate:  booking.listing.dailyRentalRate,
      securityDeposit:  booking.listing.securityDeposit,
      rentalDays,
    });

    // ── Payment mode ──
    let paymentDetails;

    if (YOUPI_PG_ENABLED && PAYMENT_MODE === 'youpi') {
      const orderId = `c360-${bookingId}-${Date.now()}`;
      paymentDetails = await createYoupiPayment({
        orderId,
        amountPaise:   commissionData.grossRentalAmountPaise + commissionData.securityDepositPaise,
        bookingId,
        borrowerName:  booking.borrower.fullName,
        borrowerEmail: booking.borrower.collegeEmail,
      });
    } else {
      // Mock mode (default for local dev)
      paymentDetails = createMockPayment(bookingId);
    }

    // ── Create transaction record ──
    const transaction = await prisma.rentalTransaction.create({
      data: {
        bookingId,
        grossRentalAmountPaise:  commissionData.grossRentalAmountPaise,
        securityDepositPaise:    commissionData.securityDepositPaise,
        commissionRateBps:       commissionData.commissionRateBps,
        commissionPaise:         commissionData.commissionPaise,
        ownerNetPaise:           commissionData.ownerNetPaise,
        paymentStatus:           paymentDetails.status === 'mock_paid' ? 'mock_paid' : 'youpi_initiated',
        youpiPaymentId:          paymentDetails.paymentId !== null && !paymentDetails.paymentId?.startsWith('mock_')
          ? paymentDetails.paymentId
          : null,
        youpiOrderId:            YOUPI_PG_ENABLED ? `c360-${bookingId}-${Date.now()}` : null,
        youpiCheckoutUrl:        paymentDetails.checkoutUrl,
        youpiRawStatus:          paymentDetails.status,
      },
    });

    // Create payout record immediately (status: pending until admin confirms)
    await prisma.payoutRecord.create({
      data: {
        transactionId: transaction.id,
        ownerId:       booking.ownerId,
        amountPaise:   commissionData.ownerNetPaise,
        status:        'pending',
      },
    });

    logger.info(
      { transactionId: transaction.id, bookingId, mode: PAYMENT_MODE },
      'Payment initiated'
    );

    return res.status(201).json({
      success: true,
      data: paymentResponse(transaction),
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in initiatePayment');
    next(error);
  }
};

// ─── Get Booking Payment ──────────────────────────────────────────────────────

export const getBookingPayment = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        borrowerId: true,
        ownerId:    true,
        transaction: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Only borrower, owner, or admin can see payment details
    const isParticipant = booking.borrowerId === req.user.id || booking.ownerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!booking.transaction) {
      return res.status(404).json({ success: false, message: 'No payment found for this booking.' });
    }

    return res.status(200).json({ success: true, data: paymentResponse(booking.transaction) });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in getBookingPayment');
    next(error);
  }
};

// ─── YouPI-PG Webhook Handler ─────────────────────────────────────────────────

/**
 * POST /api/payments/webhook/youpi
 * Body must arrive as raw Buffer (set by express.raw() in route).
 */
export const youpiWebhook = async (req, res, next) => {
  try {
    // req.body is a Buffer from express.raw()
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : String(req.body || '');

    // ── HMAC Verification ──
    const webhookSecret = process.env.YOUPI_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('YOUPI_WEBHOOK_SECRET not configured — rejecting webhook');
      return res.status(500).json({ success: false, message: 'Webhook secret not configured.' });
    }

    const sigV2  = req.headers['x-gateway-signature-v2'];
    const sigV1  = req.headers['x-gateway-signature'];
    const tsHeader = req.headers['x-gateway-timestamp'];

    let verified = false;
    if (sigV2 && tsHeader) {
      const result = verifyWebhookSignatureV2(rawBody, webhookSecret, sigV2, tsHeader);
      verified = result.valid;
      if (!verified) {
        logger.warn({ reason: result.reason }, 'YouPI webhook V2 signature verification failed');
      }
    } else if (sigV1) {
      verified = verifyWebhookSignatureV1(rawBody, webhookSecret, sigV1);
      if (!verified) {
        logger.warn('YouPI webhook V1 signature verification failed');
      }
    }

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Webhook signature verification failed.' });
    }

    // ── Parse payload ──
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid JSON payload.' });
    }

    const { event, paymentId: youpiPaymentId, amountPaise } = payload;
    const deliveryId = req.headers['x-gateway-delivery-id'] || null;
    const bodyHash   = hashBody(rawBody);

    if (!youpiPaymentId || !event) {
      return res.status(400).json({ success: false, message: 'Missing paymentId or event in payload.' });
    }

    // ── Idempotency check ──
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { youpiPaymentId_event: { youpiPaymentId, event } },
    });

    if (existingEvent) {
      logger.info({ youpiPaymentId, event }, 'Duplicate webhook event received — ignored');
      return res.status(200).json({ success: true, message: 'Event already processed.' });
    }

    // Record the event first (prevents race conditions)
    await prisma.paymentWebhookEvent.create({
      data: { youpiPaymentId, event, deliveryId, payloadHash: bodyHash },
    });

    // ── Find transaction ──
    const transaction = await prisma.rentalTransaction.findFirst({
      where: { youpiPaymentId },
    });

    if (!transaction) {
      logger.warn({ youpiPaymentId, event }, 'YouPI webhook: no matching transaction found');
      // Return 200 so YouPI doesn't retry for events we don't know about
      return res.status(200).json({ success: true, message: 'No matching transaction.' });
    }

    // ── Update transaction status based on event ──
    let newPaymentStatus = transaction.paymentStatus;

    if (YOUPI_OBSERVED_EVENTS.has(event)) {
      // OBSERVED_SUCCESS = bank alert, NOT reconciled. Do NOT auto-confirm.
      newPaymentStatus = 'youpi_observed';
      logger.info({ youpiPaymentId, event, transactionId: transaction.id },
        'YouPI OBSERVED_SUCCESS: transaction updated. Admin must reconcile before confirming payout.');
    } else if (YOUPI_FAILED_EVENTS.has(event)) {
      newPaymentStatus = 'cancelled';
    }
    // Note: 'SUCCESS' from YouPI = COD only, not UPI — handle the same as observed for now

    if (newPaymentStatus !== transaction.paymentStatus) {
      await prisma.rentalTransaction.update({
        where: { id: transaction.id },
        data: {
          paymentStatus:  newPaymentStatus,
          youpiRawStatus: event,
          youpiUtr:       payload.utr || transaction.youpiUtr,
        },
      });

      logger.info(
        { transactionId: transaction.id, oldStatus: transaction.paymentStatus, newStatus: newPaymentStatus },
        'Transaction status updated from YouPI webhook'
      );
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in youpiWebhook');
    next(error);
  }
};

// ─── Admin: List Transactions ────────────────────────────────────────────────

export const listTransactions = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip  = (page - 1) * limit;
    const { status } = req.query;

    const where = status ? { paymentStatus: status } : {};

    const [transactions, total] = await prisma.$transaction([
      prisma.rentalTransaction.findMany({
        where,
        include: {
          booking: {
            select: { id: true, startDate: true, endDate: true, status: true, borrowerId: true, ownerId: true }
          },
          payout: { select: { status: true, paidAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.rentalTransaction.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Get Transaction ───────────────────────────────────────────────────

export const getTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const transaction = await prisma.rentalTransaction.findUnique({
      where: { id: transactionId },
      include: {
        booking: {
          include: {
            listing: { select: { title: true, dailyRentalRate: true } },
            borrower: { select: { fullName: true, collegeEmail: true } },
          },
        },
        payout: true,
      },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    return res.status(200).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Confirm Transaction ───────────────────────────────────────────────

export const confirmTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { note } = req.body || {};

    const transaction = await prisma.rentalTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    if (transaction.paymentStatus === 'confirmed') {
      return res.status(400).json({ success: false, message: 'Transaction already confirmed.' });
    }

    const updated = await prisma.rentalTransaction.update({
      where: { id: transactionId },
      data: {
        paymentStatus: 'confirmed',
        notes: note || transaction.notes,
      },
    });

    logger.info({ transactionId, adminId: req.user.id }, 'Transaction confirmed by admin');

    return res.status(200).json({ success: true, data: paymentResponse(updated) });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Record Refund ────────────────────────────────────────────────────

export const recordRefund = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { refundAmountPaise, note } = req.body || {};

    if (!refundAmountPaise || typeof refundAmountPaise !== 'number' || refundAmountPaise <= 0) {
      return res.status(400).json({ success: false, message: 'refundAmountPaise must be a positive integer.' });
    }

    const transaction = await prisma.rentalTransaction.findUnique({ where: { id: transactionId } });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' });
    }

    const totalRefunded = transaction.refundedAmountPaise + refundAmountPaise;
    if (totalRefunded > transaction.grossRentalAmountPaise) {
      return res.status(400).json({
        success: false,
        message: `Refund would exceed gross rental amount. Max refundable: ${transaction.grossRentalAmountPaise - transaction.refundedAmountPaise} paise.`,
      });
    }

    const { adjustedOwnerNetPaise, adjustedCommissionPaise } = applyRefundToCommission({
      grossRentalAmountPaise: transaction.grossRentalAmountPaise,
      commissionRateBps:      transaction.commissionRateBps,
      refundAmountPaise:      totalRefunded,
    });

    const isFullRefund = totalRefunded >= transaction.grossRentalAmountPaise;

    const [updatedTx] = await prisma.$transaction([
      prisma.rentalTransaction.update({
        where: { id: transactionId },
        data: {
          refundedAmountPaise: totalRefunded,
          refundNote: note || null,
          commissionPaise: adjustedCommissionPaise,
          ownerNetPaise:   adjustedOwnerNetPaise,
          paymentStatus:   isFullRefund ? 'refunded_full' : 'refunded_partial',
        },
      }),
      // Update payout amount to reflect refund
      ...(transaction.payout
        ? [prisma.payoutRecord.updateMany({
            where: { transactionId },
            data: { amountPaise: adjustedOwnerNetPaise },
          })]
        : []),
    ]);

    logger.info({ transactionId, refundAmountPaise, adminId: req.user.id }, 'Refund recorded by admin');

    return res.status(200).json({ success: true, data: paymentResponse(updatedTx) });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: List Payouts ─────────────────────────────────────────────────────

export const listPayouts = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip  = (page - 1) * limit;
    const { status } = req.query;

    const where = status ? { status } : {};

    const [payouts, total] = await prisma.$transaction([
      prisma.payoutRecord.findMany({
        where,
        include: {
          owner: { select: { fullName: true, collegeEmail: true } },
          transaction: {
            select: { id: true, bookingId: true, grossRentalAmountPaise: true, commissionPaise: true, paymentStatus: true }
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payoutRecord.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: payouts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Mark Payout Paid ─────────────────────────────────────────────────

export const markPayoutPaid = async (req, res, next) => {
  try {
    const { payoutId } = req.params;
    const { method, reference, adminNote } = req.body || {};

    if (!method) {
      return res.status(400).json({ success: false, message: 'method is required (e.g. "UPI", "bank_transfer").' });
    }

    const payout = await prisma.payoutRecord.findUnique({ where: { id: payoutId } });
    if (!payout) {
      return res.status(404).json({ success: false, message: 'Payout record not found.' });
    }

    if (payout.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Payout already marked as paid.' });
    }

    const updated = await prisma.payoutRecord.update({
      where: { id: payoutId },
      data: {
        status:    'paid',
        method,
        reference: reference || null,
        adminNote: adminNote || null,
        paidAt:    new Date(),
      },
    });

    logger.info({ payoutId, method, adminId: req.user.id }, 'Payout marked as paid by admin');

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
