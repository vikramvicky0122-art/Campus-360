import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createTestListing, createTestBooking, cleanup } from './helpers/setup.js';

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

afterAll(async () => {
  await cleanup();
});

// --- Booking Creation ---

describe('POST /api/bookings -- Create Booking', () => {
  let owner, borrower, listing, ownerHeader, borrowerHeader;

  beforeAll(async () => {
    const ownerResult = await createTestUser({ fullName: 'Book Owner' });
    owner = ownerResult.user;
    ownerHeader = ownerResult.header;

    const borrowerResult = await createTestUser({ fullName: 'Book Borrower' });
    borrower = borrowerResult.user;
    borrowerHeader = borrowerResult.header;

    listing = await createTestListing({
      ownerId: owner.id,
      title: 'Bookable Item',
      dailyRentalRate: 500,
      securityDeposit: 2000,
      retailPrice: 10000,
    });
  });

  it('should require authentication', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({ listingId: listing.id, startDate: '2026-07-01', endDate: '2026-07-03' });
    expect(res.status).toBe(401);
  });

  it('should create a booking request', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', borrowerHeader)
      .send({ listingId: listing.id, startDate: '2026-07-01', endDate: '2026-07-03' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('requested');
    expect(res.body.data.listingId).toBe(listing.id);
    expect(res.body.data.borrowerId).toBe(borrower.id);
    expect(res.body.data.ownerId).toBe(owner.id);
    expect(res.body.data.totalPriceSnapshot).toBe(1500);
    expect(res.body.data.securityDepositSnapshot).toBe(2000);
  });

  it('should prevent self-booking', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', ownerHeader)
      .send({ listingId: listing.id, startDate: '2026-08-01', endDate: '2026-08-03' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot book your own listing/i);
  });

  it('should reject invalid dates', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', borrowerHeader)
      .send({ listingId: listing.id, startDate: 'not-a-date', endDate: '2026-07-03' });
    expect(res.status).toBe(400);
  });

  it('should reject end date before start date', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', borrowerHeader)
      .send({ listingId: listing.id, startDate: '2026-07-10', endDate: '2026-07-05' });
    expect(res.status).toBe(400);
  });

  it('should reject non-existent listing', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', borrowerHeader)
      .send({ listingId: 'non-existent', startDate: '2026-07-01', endDate: '2026-07-03' });
    expect(res.status).toBe(404);
  });

  it('should allow overlapping requested bookings (only blocks on approval)', async () => {
    const booking1 = await request(app)
      .post('/api/bookings')
      .set('Authorization', borrowerHeader)
      .send({ listingId: listing.id, startDate: '2026-07-15', endDate: '2026-07-20' });
    expect(booking1.status).toBe(201);

    const sbResult = await createTestUser({ fullName: 'Second Overlap Borrower' });
    const secondBorrowerHeader = sbResult.header;

    const overlapRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', secondBorrowerHeader)
      .send({ listingId: listing.id, startDate: '2026-07-16', endDate: '2026-07-18' });
    expect(overlapRes.status).toBe(201);
  });
});

// --- Happy Path ---

describe('Booking Lifecycle -- Full Happy Path', () => {
  let owner, borrower, listing, ownerHeader, borrowerHeader, booking;

  beforeAll(async () => {
    const ownerResult = await createTestUser({ fullName: 'Lifecycle Owner' });
    owner = ownerResult.user;
    ownerHeader = ownerResult.header;
    const borrowerResult = await createTestUser({ fullName: 'Lifecycle Borrower' });
    borrower = borrowerResult.user;
    borrowerHeader = borrowerResult.header;
    listing = await createTestListing({
      ownerId: owner.id,
      title: 'Lifecycle Test Item',
      dailyRentalRate: 1000,
      securityDeposit: 5000,
      retailPrice: 50000,
    });
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', borrowerHeader)
      .send({ listingId: listing.id, startDate: '2026-09-01', endDate: '2026-09-05' });
    booking = createRes.body.data;
  });

  it('owner can approve requested booking', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', ownerHeader)
      .send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
    expect(res.body.data.approvedAt).toBeTruthy();
  });

  it('borrower cannot approve', async () => {
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', borrowerHeader)
      .send({ listingId: listing.id, startDate: '2026-10-01', endDate: '2026-10-03' });
    const newBooking = createRes.body.data;
    const url = '/api/bookings/' + newBooking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', borrowerHeader)
      .send({ status: 'approved' });
    expect(res.status).toBe(403);
  });

  it('owner can mark item as given', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', ownerHeader)
      .send({ status: 'item_given' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('item_given');
  });

  it('borrower cannot mark item given', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', borrowerHeader)
      .send({ status: 'item_given' });
    expect(res.status).toBe(403);
  });

  it('owner cannot confirm receipt (only borrower)', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', ownerHeader)
      .send({ status: 'ongoing' });
    expect(res.status).toBe(403);
  });

  it('borrower can confirm receipt', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', borrowerHeader)
      .send({ status: 'ongoing' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ongoing');
  });

  it('owner cannot initiate return', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', ownerHeader)
      .send({ status: 'return_pending' });
    expect(res.status).toBe(403);
  });

  it('borrower can initiate return', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', borrowerHeader)
      .send({ status: 'return_pending' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('return_pending');
  });

  it('borrower cannot complete (only owner)', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', borrowerHeader)
      .send({ status: 'completed' });
    expect(res.status).toBe(403);
  });

  it('owner can confirm return and complete', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', ownerHeader)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.returnedAt).toBeTruthy();
  });

  it('completed booking rejects further transitions', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', ownerHeader)
      .send({ status: 'ongoing' });
    // Code checks actor role before state: owner can't do 'ongoing', so 403
    expect(res.status).toBe(403);
  });
});

// --- Rejection Flow ---

describe('Booking Lifecycle -- Rejection Flow', () => {
  let owner, borrower, listing, ownerHeader, borrowerHeader, booking;

  beforeAll(async () => {
    const ownerResult = await createTestUser({ fullName: 'Reject Owner' });
    owner = ownerResult.user;
    ownerHeader = ownerResult.header;
    const borrowerResult = await createTestUser({ fullName: 'Reject Borrower' });
    borrower = borrowerResult.user;
    borrowerHeader = borrowerResult.header;
    listing = await createTestListing({
      ownerId: owner.id,
      title: 'Rejectable Item',
      dailyRentalRate: 500,
    });
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', borrowerHeader)
      .send({ listingId: listing.id, startDate: '2026-11-01', endDate: '2026-11-03' });
    booking = createRes.body.data;
  });

  it('owner can reject requested booking', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', ownerHeader)
      .send({ status: 'rejected' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });

  it('borrower cannot reject', async () => {
    const createRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', borrowerHeader)
      .send({ listingId: listing.id, startDate: '2026-12-01', endDate: '2026-12-03' });
    const newBooking = createRes.body.data;
    const url = '/api/bookings/' + newBooking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', borrowerHeader)
      .send({ status: 'rejected' });
    expect(res.status).toBe(403);
  });

  it('rejected booking cannot be approved', async () => {
    const url = '/api/bookings/' + booking.id + '/status';
    const res = await request(app)
      .patch(url)
      .set('Authorization', ownerHeader)
      .send({ status: 'approved' });
    expect(res.status).toBe(409);
  });
});

// --- Cancellation Flow ---

describe('Booking Lifecycle -- Cancellation Flow', () => {
  let owner, borrower, listing, ownerHeader, borrowerHeader;

  beforeAll(async () => {
    const ownerResult = await createTestUser({ fullName: 'Cancel Owner' });
    owner = ownerResult.user;
    ownerHeader = ownerResult.header;
    const borrowerResult = await createTestUser({ fullName: 'Cancel Borrower' });
    borrower = borrowerResult.user;
    borrowerHeader = borrowerResult.header;
    listing = await createTestListing({
      ownerId: owner.id,
      title: 'Cancellable Item',
      dailyRentalRate: 500,
    });
  });

  it('owner can cancel requested booking', async () => {
    const b = (await request(app).post('/api/bookings').set('Authorization', borrowerHeader).send({ listingId: listing.id, startDate: '2026-12-10', endDate: '2026-12-12' })).body.data;
    const url = '/api/bookings/' + b.id + '/status';
    const res = await request(app).patch(url).set('Authorization', ownerHeader).send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.cancelledAt).toBeTruthy();
  });

  it('borrower can cancel their requested booking', async () => {
    const b = (await request(app).post('/api/bookings').set('Authorization', borrowerHeader).send({ listingId: listing.id, startDate: '2026-12-15', endDate: '2026-12-17' })).body.data;
    const url = '/api/bookings/' + b.id + '/status';
    const res = await request(app).patch(url).set('Authorization', borrowerHeader).send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('cannot cancel already cancelled booking', async () => {
    const b = (await request(app).post('/api/bookings').set('Authorization', borrowerHeader).send({ listingId: listing.id, startDate: '2026-12-20', endDate: '2026-12-22' })).body.data;
    const url = '/api/bookings/' + b.id + '/status';
    await request(app).patch(url).set('Authorization', borrowerHeader).send({ status: 'cancelled' });
    const res = await request(app).patch(url).set('Authorization', borrowerHeader).send({ status: 'cancelled' });
    expect(res.status).toBe(409);
  });

  it('unauthorized user cannot cancel', async () => {
    const stranger = await createTestUser({ fullName: 'Stranger' });
    const b = (await request(app).post('/api/bookings').set('Authorization', borrowerHeader).send({ listingId: listing.id, startDate: '2026-12-25', endDate: '2026-12-27' })).body.data;
    const url = '/api/bookings/' + b.id + '/status';
    const res = await request(app).patch(url).set('Authorization', stranger.header).send({ status: 'cancelled' });
    expect(res.status).toBe(403);
  });

  it('can cancel approved booking', async () => {
    const b = (await request(app).post('/api/bookings').set('Authorization', borrowerHeader).send({ listingId: listing.id, startDate: '2026-12-28', endDate: '2026-12-30' })).body.data;
    const url = '/api/bookings/' + b.id + '/status';
    await request(app).patch(url).set('Authorization', ownerHeader).send({ status: 'approved' });
    const res = await request(app).patch(url).set('Authorization', ownerHeader).send({ status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('cannot cancel from item_given state', async () => {
    const b = (await request(app).post('/api/bookings').set('Authorization', borrowerHeader).send({ listingId: listing.id, startDate: '2027-01-05', endDate: '2027-01-07' })).body.data;
    await request(app).patch('/api/bookings/' + b.id + '/status').set('Authorization', ownerHeader).send({ status: 'approved' });
    await request(app).patch('/api/bookings/' + b.id + '/status').set('Authorization', ownerHeader).send({ status: 'item_given' });
    const url = '/api/bookings/' + b.id + '/status';
    const res = await request(app).patch(url).set('Authorization', ownerHeader).send({ status: 'cancelled' });
    expect(res.status).toBe(409);
  });

  it('cannot cancel from ongoing state', async () => {
    const b = (await request(app).post('/api/bookings').set('Authorization', borrowerHeader).send({ listingId: listing.id, startDate: '2027-01-10', endDate: '2027-01-12' })).body.data;
    await request(app).patch('/api/bookings/' + b.id + '/status').set('Authorization', ownerHeader).send({ status: 'approved' });
    await request(app).patch('/api/bookings/' + b.id + '/status').set('Authorization', ownerHeader).send({ status: 'item_given' });
    await request(app).patch('/api/bookings/' + b.id + '/status').set('Authorization', borrowerHeader).send({ status: 'ongoing' });
    const url = '/api/bookings/' + b.id + '/status';
    const res = await request(app).patch(url).set('Authorization', borrowerHeader).send({ status: 'cancelled' });
    expect(res.status).toBe(409);
  });
});

// --- Overlap Prevention ---

describe('Booking -- Overlap Conflict Prevention', () => {
  let owner, b1, b2, listing, ownerHeader, b1Header, b2Header;

  beforeAll(async () => {
    const ownerResult = await createTestUser({ fullName: 'Overlap Owner' });
    owner = ownerResult.user;
    ownerHeader = ownerResult.header;
    const b1Result = await createTestUser({ fullName: 'Overlap Borrower 1' });
    b1 = b1Result.user;
    b1Header = b1Result.header;
    const b2Result = await createTestUser({ fullName: 'Overlap Borrower 2' });
    b2 = b2Result.user;
    b2Header = b2Result.header;
    listing = await createTestListing({ ownerId: owner.id, title: 'Overlap Test Item', dailyRentalRate: 500 });
  });

  it('prevents approving overlapping booking', async () => {
    // Create both bookings first (before either is approved)
    const b1create = (await request(app).post('/api/bookings').set('Authorization', b1Header).send({ listingId: listing.id, startDate: '2027-01-05', endDate: '2027-01-10' })).body.data;
    const b2create = (await request(app).post('/api/bookings').set('Authorization', b2Header).send({ listingId: listing.id, startDate: '2027-01-08', endDate: '2027-01-12' })).body.data;

    // Now approve booking 1
    await request(app).patch('/api/bookings/' + b1create.id + '/status').set('Authorization', ownerHeader).send({ status: 'approved' });

    // Approving booking 2 should fail due to overlap
    const url = '/api/bookings/' + b2create.id + '/status';
    const res = await request(app).patch(url).set('Authorization', ownerHeader).send({ status: 'approved' });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/overlap/i);
  });

  it('allows approving non-overlapping booking', async () => {
    const b3 = (await request(app).post('/api/bookings').set('Authorization', b2Header).send({ listingId: listing.id, startDate: '2027-01-20', endDate: '2027-01-25' })).body.data;
    const url = '/api/bookings/' + b3.id + '/status';
    const res = await request(app).patch(url).set('Authorization', ownerHeader).send({ status: 'approved' });
    expect(res.status).toBe(200);
  });

  it('allows overlapping requested bookings, fails on approve', async () => {
    // Use a fresh listing to avoid conflict with already approved bookings from previous tests
    const newListing = await createTestListing({ ownerId: owner.id, title: 'Overlap Request Fresh', dailyRentalRate: 500 });

    // Create booking A (not yet approved)
    const bA = (await request(app).post('/api/bookings').set('Authorization', b1Header).send({ listingId: newListing.id, startDate: '2027-02-01', endDate: '2027-02-05' })).body.data;
    expect(bA).toBeDefined();

    // Create booking B that overlaps with booking A — allowed at creation because A is still 'requested'
    const bB = (await request(app).post('/api/bookings').set('Authorization', b2Header).send({ listingId: newListing.id, startDate: '2027-02-03', endDate: '2027-02-07' })).body.data;
    expect(bB).toBeDefined();

    // Approve booking A
    await request(app).patch('/api/bookings/' + bA.id + '/status').set('Authorization', ownerHeader).send({ status: 'approved' });

    // Approve booking B — should fail since it overlaps with now-approved booking A
    const url = '/api/bookings/' + bB.id + '/status';
    const res = await request(app).patch(url).set('Authorization', ownerHeader).send({ status: 'approved' });
    expect(res.status).toBe(409);
  });
});

// --- Invalid Transitions ---

describe('Booking -- Invalid Transitions', () => {
  let owner, borrower, listing, ownerHeader, borrowerHeader;

  beforeAll(async () => {
    const ownerResult = await createTestUser({ fullName: 'Invalid Owner' });
    owner = ownerResult.user;
    ownerHeader = ownerResult.header;
    const borrowerResult = await createTestUser({ fullName: 'Invalid Borrower' });
    borrower = borrowerResult.user;
    borrowerHeader = borrowerResult.header;
    listing = await createTestListing({ ownerId: owner.id, title: 'Invalid Transition Item', dailyRentalRate: 500 });
  });

  it('rejects unsupported status', async () => {
    const b = (await request(app).post('/api/bookings').set('Authorization', borrowerHeader).send({ listingId: listing.id, startDate: '2027-02-01', endDate: '2027-02-03' })).body.data;
    const url = '/api/bookings/' + b.id + '/status';
    const res = await request(app).patch(url).set('Authorization', ownerHeader).send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });

  it('rejects skipping states', async () => {
    const b = (await request(app).post('/api/bookings').set('Authorization', borrowerHeader).send({ listingId: listing.id, startDate: '2027-02-05', endDate: '2027-02-07' })).body.data;
    const url = '/api/bookings/' + b.id + '/status';
    const res = await request(app).patch(url).set('Authorization', ownerHeader).send({ status: 'ongoing' });
    // Code checks actor role first: owner can't do 'ongoing' transition, so 403
    expect(res.status).toBe(403);
  });
});

// --- My Bookings ---

describe('GET /api/bookings/my-bookings', () => {
  let owner, borrower, listing, ownerHeader, borrowerHeader;

  beforeAll(async () => {
    const ownerResult = await createTestUser({ fullName: 'MyBookings Owner' });
    owner = ownerResult.user;
    ownerHeader = ownerResult.header;
    const borrowerResult = await createTestUser({ fullName: 'MyBookings Borrower' });
    borrower = borrowerResult.user;
    borrowerHeader = borrowerResult.header;
    listing = await createTestListing({ ownerId: owner.id, title: 'MyBookings Test', dailyRentalRate: 500 });
    for (let i = 0; i < 3; i++) {
      const day = 10 + i * 5;
      const sd = '2027-03-' + String(day).padStart(2, '0');
      const ed = '2027-03-' + String(day + 2).padStart(2, '0');
      await request(app).post('/api/bookings').set('Authorization', borrowerHeader).send({
        listingId: listing.id,
        startDate: sd,
        endDate: ed,
      });
    }
  });

  it('requires auth', async () => {
    const res = await request(app).get('/api/bookings/my-bookings');
    expect(res.status).toBe(401);
  });

  it('returns borrower and lent bookings grouped', async () => {
    const res = await request(app).get('/api/bookings/my-bookings').set('Authorization', borrowerHeader);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.borrowings)).toBe(true);
    expect(Array.isArray(res.body.data.lending)).toBe(true);
    expect(res.body.data.borrowings.length).toBeGreaterThanOrEqual(3);
  });

  it('shows lending for owner', async () => {
    const res = await request(app).get('/api/bookings/my-bookings').set('Authorization', ownerHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.lending.length).toBeGreaterThanOrEqual(3);
  });
});
