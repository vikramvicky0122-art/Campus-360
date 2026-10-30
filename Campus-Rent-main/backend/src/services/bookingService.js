import prisma from '../utils/prismaClient.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import * as conversationService from './conversationService.js';

class BookingError extends AppError {
  constructor(message, statusCode) {
    super(message, statusCode);
    this.name = 'BookingError';
  }
}

const BOOKING_STATUS = {
  requested: 'requested',
  approved: 'approved',
  itemGiven: 'item_given',
  ongoing: 'ongoing',
  returnPending: 'return_pending',
  completed: 'completed',
  rejected: 'rejected',
  cancelled: 'cancelled'
};

const BLOCKING_BOOKING_STATUSES = [
  BOOKING_STATUS.approved,
  BOOKING_STATUS.itemGiven,
  BOOKING_STATUS.ongoing,
  BOOKING_STATUS.returnPending
];

export const getMyBookings = async (userId) => {
  const commonInclude = {
    listing: {
      select: {
        id: true,
        title: true,
        securityDeposit: true,
        images: { orderBy: { displayOrder: 'asc' }, take: 1 }
      }
    },
    borrower: {
      select: {
        id: true,
        fullName: true,
        profileImage: true,
        department: true
      }
    },
    cancelledBy: {
      select: {
        id: true,
        fullName: true
      }
    }
  };

  const borrowings = await prisma.booking.findMany({
    where: { borrowerId: userId },
    include: commonInclude,
    orderBy: { createdAt: 'desc' }
  });

  const lending = await prisma.booking.findMany({
    where: { ownerId: userId },
    include: commonInclude,
    orderBy: { createdAt: 'desc' }
  });

  return { borrowings, lending };
};

export const createBooking = async (payload) => {
  const { listingId, borrowerId, startDate, endDate, pickupZone = '', pickupTime = null } = payload || {};

  if (!listingId || !borrowerId || !startDate || !endDate) {
    throw new BookingError('listingId, borrowerId, startDate and endDate are required.', 400);
  }

  const parsedStart = new Date(startDate);
  const parsedEnd = new Date(endDate);
  if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
    throw new BookingError('Invalid booking dates provided.', 400);
  }

  if (parsedEnd < parsedStart) {
    throw new BookingError('End date cannot be before start date.', 400);
  }

  const listing = await prisma.listing.findUnique({
    where: { id: String(listingId) },
    select: {
      id: true,
      ownerId: true,
      dailyRentalRate: true,
      securityDeposit: true
    }
  });

  if (!listing) {
    throw new BookingError('Listing not found.', 404);
  }

  if (listing.ownerId === String(borrowerId)) {
    throw new BookingError('You cannot book your own listing.', 400);
  }

  const days = Math.floor((parsedEnd.getTime() - parsedStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalPriceSnapshot = Number((listing.dailyRentalRate * days).toFixed(2));

  const booking = await prisma.$transaction(async (tx) => {
    const overlap = await tx.booking.findFirst({
      where: {
        listingId: listing.id,
        status: { in: BLOCKING_BOOKING_STATUSES },
        startDate: { lte: parsedEnd },
        endDate: { gte: parsedStart }
      },
      select: { id: true, startDate: true, endDate: true }
    });

    if (overlap) {
      throw new BookingError('Requested dates overlap with an existing booking.', 409);
    }

    return tx.booking.create({
      data: {
        listingId: listing.id,
        borrowerId: String(borrowerId),
        ownerId: listing.ownerId,
        startDate: parsedStart,
        endDate: parsedEnd,
        status: BOOKING_STATUS.requested,
        totalPriceSnapshot,
        securityDepositSnapshot: listing.securityDeposit,
        pickupZone: pickupZone || 'Default Zone',
        pickupTime: pickupTime ? new Date(pickupTime) : null
      }
    });
  });

  return booking;
};

const ALLOWED_TARGET_STATUSES = new Set([
  BOOKING_STATUS.approved,
  BOOKING_STATUS.itemGiven,
  BOOKING_STATUS.ongoing,
  BOOKING_STATUS.returnPending,
  BOOKING_STATUS.completed,
  BOOKING_STATUS.rejected,
  BOOKING_STATUS.cancelled
]);

export const updateBookingStatus = async ({ bookingId, actorId, status }) => {
  if (!bookingId || !actorId || !status) {
    throw new BookingError('bookingId, actorId and status are required.', 400);
  }

  const nextStatus = String(status).toLowerCase();
  if (!ALLOWED_TARGET_STATUSES.has(nextStatus)) {
    throw new BookingError('Unsupported booking status transition.', 400);
  }

  const booking = await prisma.booking.findUnique({
    where: { id: String(bookingId) },
    select: {
      id: true,
      listingId: true,
      borrowerId: true,
      ownerId: true,
      startDate: true,
      endDate: true,
      status: true
    }
  });

  if (!booking) {
    throw new BookingError('Booking not found.', 404);
  }

  const isOwner = booking.ownerId === String(actorId);
  const isBorrower = booking.borrowerId === String(actorId);
  if (!isOwner && !isBorrower) {
    logger.warn(
      { actorId, bookingId, bookingOwnerId: booking.ownerId, bookingBorrowerId: booking.borrowerId },
      'Booking authorization violation: user is neither owner nor borrower'
    );
    throw new BookingError('You are not authorized to update this booking.', 403);
  }

  const now = new Date();
  const data = {};

  if (nextStatus === BOOKING_STATUS.approved) {
    if (!isOwner) {
      logger.warn({ actorId, bookingId, role: 'borrower', attemptedAction: 'approve' }, 'Booking authorization violation: borrower attempted to approve');
      throw new BookingError('Only the listing owner can approve this booking.', 403);
    }
    if (booking.status !== BOOKING_STATUS.requested) {
      throw new BookingError('Only requested bookings can be approved.', 409);
    }

    const approved = await prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          listingId: booking.listingId,
          id: { not: booking.id },
          status: { in: BLOCKING_BOOKING_STATUSES },
          startDate: { lte: booking.endDate },
          endDate: { gte: booking.startDate }
        },
        select: { id: true }
      });

      if (conflict) {
        throw new BookingError('Cannot approve: dates overlap with an existing confirmed booking.', 409);
      }

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status: BOOKING_STATUS.approved, approvedAt: now }
      });

      // Auto-create conversation, reusing the same transaction client
      await conversationService.createConversationForBooking(
        booking.id,
        booking.ownerId,
        booking.borrowerId,
        tx
      );

      return updated;
    }, { timeout: 15000 });

    return approved;
  } else if (nextStatus === BOOKING_STATUS.itemGiven) {
    if (!isOwner) {
      throw new BookingError('Only the listing owner can mark this booking as item given.', 403);
    }
    if (booking.status !== BOOKING_STATUS.approved) {
      throw new BookingError('Only approved bookings can move to item given.', 409);
    }
    data.status = BOOKING_STATUS.itemGiven;
  } else if (nextStatus === BOOKING_STATUS.ongoing) {
    if (!isBorrower) {
      throw new BookingError('Only the borrower can confirm item receipt.', 403);
    }
    if (booking.status !== BOOKING_STATUS.itemGiven) {
      throw new BookingError('Booking must be item given before it becomes ongoing.', 409);
    }
    data.status = BOOKING_STATUS.ongoing;
  } else if (nextStatus === BOOKING_STATUS.returnPending) {
    if (!isBorrower) {
      throw new BookingError('Only the borrower can request return.', 403);
    }
    if (booking.status !== BOOKING_STATUS.ongoing) {
      throw new BookingError('Only ongoing bookings can request return.', 409);
    }
    data.status = BOOKING_STATUS.returnPending;
  } else if (nextStatus === BOOKING_STATUS.completed) {
    if (!isOwner) {
      throw new BookingError('Only the listing owner can confirm return.', 403);
    }
    if (booking.status !== BOOKING_STATUS.returnPending) {
      throw new BookingError('Booking must be return pending before completion.', 409);
    }
    data.status = BOOKING_STATUS.completed;
    data.returnedAt = now;
  } else if (nextStatus === BOOKING_STATUS.rejected) {
    if (!isOwner) {
      throw new BookingError('Only the listing owner can reject this booking.', 403);
    }
    if (booking.status !== BOOKING_STATUS.requested) {
      throw new BookingError('Only requested bookings can be rejected.', 409);
    }
    data.status = BOOKING_STATUS.rejected;
  } else if (nextStatus === BOOKING_STATUS.cancelled) {
    if (![BOOKING_STATUS.requested, BOOKING_STATUS.approved].includes(booking.status)) {
      throw new BookingError('Only requested or approved bookings can be cancelled.', 409);
    }
    data.status = BOOKING_STATUS.cancelled;
    data.cancelledAt = now;
    data.cancelledById = String(actorId);

    // Cancel any pending/initiated transaction linked to this booking
    try {
      const tx = await prisma.rentalTransaction.findUnique({ where: { bookingId: booking.id } });
      if (tx && ['pending', 'youpi_initiated'].includes(tx.paymentStatus)) {
        await prisma.rentalTransaction.update({
          where: { id: tx.id },
          data: { paymentStatus: 'cancelled' },
        });
      }
    } catch (txErr) {
      logger.warn({ err: txErr, bookingId: booking.id }, 'Could not update transaction on booking cancellation');
    }
  }

  return prisma.booking.update({
    where: { id: booking.id },
    data
  });
};
