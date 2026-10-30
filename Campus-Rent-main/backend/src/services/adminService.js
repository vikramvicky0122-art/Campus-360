import prisma from '../utils/prismaClient.js';
import { NotFoundError, BadRequestError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export const getStats = async () => {
  const [
    totalUsers,
    totalListings,
    activeListings,
    totalBookings,
    activeBookings,
    completedBookings,
    totalTransactions,
    commissionSummary,
    pendingPayouts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.listing.count({ where: { status: 'active' } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: { in: ['approved', 'item_given', 'ongoing', 'return_pending'] } } }),
    prisma.booking.count({ where: { status: 'completed' } }),
    prisma.rentalTransaction.count(),
    prisma.rentalTransaction.aggregate({
      _sum: {
        commissionPaise: true,
        grossRentalAmountPaise: true,
        ownerNetPaise: true,
      },
    }),
    prisma.payoutRecord.count({ where: { status: 'pending' } }),
  ]);

  return {
    totalUsers,
    totalListings,
    activeListings,
    totalBookings,
    activeBookings,
    completedBookings,
    totalTransactions,
    totalCommissionPaise: commissionSummary._sum.commissionPaise || 0,
    totalGrossRentalPaise: commissionSummary._sum.grossRentalAmountPaise || 0,
    totalOwnerNetPaise: commissionSummary._sum.ownerNetPaise || 0,
    pendingPayouts,
  };
};

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------

export const getUsers = async (filters = {}) => {
  const { q, page = 1, limit = 20 } = filters;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const where = {};
  if (q) {
    where.OR = [
      { collegeEmail: { contains: q, mode: 'insensitive' } },
      { fullName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        collegeEmail: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

// ---------------------------------------------------------------------------
// Booking Management
// ---------------------------------------------------------------------------

export const getBookings = async (filters = {}) => {
  const { status, userId, page = 1, limit = 20 } = filters;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const where = {};
  if (status) {
    where.status = status;
  }
  if (userId) {
    where.OR = [
      { borrowerId: userId },
      { ownerId: userId },
    ];
  }

  const include = {
    listing: {
      select: {
        id: true,
        title: true,
        dailyRentalRate: true,
        status: true,
      },
    },
    borrower: {
      select: {
        id: true,
        fullName: true,
        collegeEmail: true,
      },
    },
  };

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    data: bookings,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

// ---------------------------------------------------------------------------
// Listing Moderation
// ---------------------------------------------------------------------------

export const hideListing = async (listingId, adminId) => {
  const listing = await prisma.listing.findUnique({
    where: { id: String(listingId) },
    select: { id: true, title: true, status: true, ownerId: true },
  });

  if (!listing) {
    throw new NotFoundError('Listing not found.');
  }

  if (listing.status === 'deleted') {
    throw new BadRequestError('Cannot moderate a deleted listing.');
  }

  if (listing.status === 'hidden') {
    return listing;
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: { status: 'hidden' },
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  logger.info(
    { adminId, listingId, action: 'listing_hidden', listingTitle: listing.title },
    `Admin ${adminId} hid listing "${listing.title}" (${listingId})`
  );

  return updated;
};

export const restoreListing = async (listingId, adminId) => {
  const listing = await prisma.listing.findUnique({
    where: { id: String(listingId) },
    select: { id: true, title: true, status: true, ownerId: true },
  });

  if (!listing) {
    throw new NotFoundError('Listing not found.');
  }

  if (listing.status !== 'hidden') {
    throw new BadRequestError('Only hidden listings can be restored.');
  }

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: { status: 'active' },
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  logger.info(
    { adminId, listingId, action: 'listing_restored', listingTitle: listing.title },
    `Admin ${adminId} restored listing "${listing.title}" (${listingId})`
  );

  return updated;
};
