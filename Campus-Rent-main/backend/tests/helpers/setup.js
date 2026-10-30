import prisma from '../../src/utils/prismaClient.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

/**
 * Test infrastructure for CampusRent integration tests.
 *
 * Provides factories for creating test data and helpers for authentication.
 * All created data is tracked for automatic cleanup via cleanup().
 *
 * USAGE:
 *   import { factory } from '../helpers/setup.js';
 *
 *   const { user, token, header } = await factory.createUser();
 *   const listing = await factory.createListing({ ownerId: user.id });
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BCRYPT_ROUNDS = 10;
const JWT_EXPIRES_IN = '7d';

// Use a deterministic secret for tests if none is configured
const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-chars-long!!';

// Track all created record IDs for cleanup
const trackedIds = {
  users: [],
  listings: [],
  listingImages: [],
  bookings: [],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uniqueSuffix = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const generateToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.collegeEmail },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// ---------------------------------------------------------------------------
// Factory methods
// ---------------------------------------------------------------------------

/**
 * Create a test user with defaults that can be overridden.
 * Returns { user, token, header } where header is a full Authorization header value.
 */
export const createTestUser = async (overrides = {}) => {
  const suffix = uniqueSuffix();
  const password = overrides.password || 'TestPass@123';
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const id = overrides.id || randomUUID();

  const userData = {
    id,
    fullName: overrides.fullName || `Test User ${suffix}`,
    collegeEmail: overrides.collegeEmail || `test_${suffix}@nitrr.ac.in`,
    passwordHash,
    role: overrides.role || 'USER',
    department: overrides.department || 'Computer Science',
    yearOfStudy: overrides.yearOfStudy || 'Junior',
    bio: overrides.bio || 'Test user bio.',
    preferredPickupZones: overrides.preferredPickupZones || ['Library Cafe'],
    lenderRating: overrides.lenderRating ?? 0,
    ratingsCount: overrides.ratingsCount ?? 0,
  };

  const user = await prisma.user.create({ data: userData });
  trackedIds.users.push(user.id);

  const token = generateToken(user);
  const header = `Bearer ${token}`;

  return { user, token, header };
};

/**
 * Create a test listing owned by the given ownerId.
 * Returns the full listing record.
 */
export const createTestListing = async (overrides = {}) => {
  const suffix = uniqueSuffix();

  const listingData = {
    title: overrides.title || `Test Listing ${suffix}`,
    description: overrides.description || 'A test listing for integration tests.',
    category: overrides.category || 'Tech',
    condition: overrides.condition || 'Excellent',
    dailyRentalRate: overrides.dailyRentalRate ?? 500,
    securityDeposit: overrides.securityDeposit ?? 2000,
    retailPrice: overrides.retailPrice ?? 10000,
    minimumRentalDays: overrides.minimumRentalDays ?? 1,
    preferredPickupZone: overrides.preferredPickupZone || 'Library Cafe',
    customPickupNote: overrides.customPickupNote || null,
    status: overrides.status || 'active',
    ownerId: overrides.ownerId,
  };

  if (!listingData.ownerId) {
    throw new Error('createTestListing requires ownerId');
  }

  const listing = await prisma.listing.create({
    data: {
      ...listingData,
      images: overrides.images !== undefined
        ? {
            create: overrides.images.map((img, i) => ({
              imageUrl: img.imageUrl || `https://example.com/img_${suffix}_${i}.jpg`,
              displayOrder: typeof img.displayOrder === 'number' ? img.displayOrder : i,
            })),
          }
        : {
            create: [
              { imageUrl: `https://example.com/img_${suffix}_0.jpg`, displayOrder: 0 },
              { imageUrl: `https://example.com/img_${suffix}_1.jpg`, displayOrder: 1 },
            ],
          },
    },
    include: {
      images: { orderBy: { displayOrder: 'asc' }, select: { imageUrl: true, displayOrder: true } },
      owner: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          department: true,
          lenderRating: true,
        },
      },
    },
  });

  trackedIds.listings.push(listing.id);
  return listing;
};

/**
 * Create a test booking with the given overrides.
 */
export const createTestBooking = async (overrides = {}) => {
  const now = new Date();
  const startDate = overrides.startDate || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endDate = overrides.endDate || new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
  const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  const bookingData = {
    listingId: overrides.listingId,
    borrowerId: overrides.borrowerId,
    ownerId: overrides.ownerId,
    startDate,
    endDate,
    status: overrides.status || 'requested',
    totalPriceSnapshot: overrides.totalPriceSnapshot ?? (overrides.dailyRate || 500) * days,
    securityDepositSnapshot: overrides.securityDepositSnapshot ?? 2000,
    pickupZone: overrides.pickupZone || 'Library Cafe',
    pickupTime: overrides.pickupTime || null,
    approvedAt: overrides.approvedAt || null,
    returnedAt: overrides.returnedAt || null,
    cancelledAt: overrides.cancelledAt || null,
    cancelledById: overrides.cancelledById || null,
    cancellationReason: overrides.cancellationReason || null,
  };

  if (!bookingData.listingId || !bookingData.borrowerId || !bookingData.ownerId) {
    throw new Error('createTestBooking requires listingId, borrowerId, and ownerId');
  }

  const booking = await prisma.booking.create({ data: bookingData });
  trackedIds.bookings.push(booking.id);
  return booking;
};

/**
 * Delete all tracked test data in reverse dependency order.
 */
export const cleanup = async () => {
  // Delete in reverse order of foreign key dependencies
  // First: delete all bookings for tracked listings (catches bookings created via API)
  if (trackedIds.listings.length > 0) {
    await prisma.booking.deleteMany({
      where: { listingId: { in: trackedIds.listings } },
    });
  }
  // Also delete individually tracked bookings
  if (trackedIds.bookings.length > 0) {
    await prisma.booking.deleteMany({
      where: { id: { in: trackedIds.bookings } },
    });
    trackedIds.bookings = [];
  }

  if (trackedIds.listingImages.length > 0) {
    await prisma.listingImage.deleteMany({
      where: { id: { in: trackedIds.listingImages } },
    });
    trackedIds.listingImages = [];
  }

  if (trackedIds.listings.length > 0) {
    await prisma.listing.deleteMany({
      where: { id: { in: trackedIds.listings } },
    });
    trackedIds.listings = [];
  }

  if (trackedIds.users.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: trackedIds.users } },
    });
    trackedIds.users = [];
  }
};

/**
 * Get auth header string from a token.
 */
export const authHeader = (token) => `Bearer ${token}`;

/**
 * Full cleanup helper for vitest afterAll hooks.
 */
export const cleanDatabase = async () => {
  await cleanup();
};

/**
 * Convenience: creates a full scenario — owner + borrower + listing + requested booking
 * Returns all created resources.
 */
export const createBookingScenario = async () => {
  const owner = await createTestUser({ fullName: 'Owner User' });
  const borrower = await createTestUser({ fullName: 'Borrower User' });

  const listing = await createTestListing({
    ownerId: owner.user.id,
    dailyRentalRate: 500,
    securityDeposit: 2000,
    retailPrice: 10000,
  });

  const booking = await createTestBooking({
    listingId: listing.id,
    borrowerId: borrower.user.id,
    ownerId: owner.user.id,
    totalPriceSnapshot: 2000,
    securityDepositSnapshot: 2000,
    dailyRate: 500,
  });

  return { owner, borrower, listing, booking };
};
