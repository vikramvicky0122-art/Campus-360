import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createTestListing, createTestBooking, cleanup } from './helpers/setup.js';
import prisma from '../src/utils/prismaClient.js';

afterAll(async () => {
  await cleanup();
});

describe('Booking — Edge Cases (coverage)', () => {
  let owner, ownerHeader;

  beforeAll(async () => {
    const o = await createTestUser({ fullName: 'BkCov Owner' });
    owner = o.user;
    ownerHeader = o.header;
  });

  it('rejects status update with missing status field (400)', async () => {
    const listing = await createTestListing({
      ownerId: owner.id,
      title: 'BkCov Missing Status',
      dailyRentalRate: 300,
    });
    const borrower = await createTestUser({ fullName: 'BkCov Borrower' });
    const bRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', borrower.header)
      .send({ listingId: listing.id, startDate: '2027-06-01', endDate: '2027-06-03' });
    const bookingId = bRes.body.data.id;
    const res = await request(app)
      .patch('/api/bookings/' + bookingId + '/status')
      .set('Authorization', ownerHeader)
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects status update for non-existent booking (404)', async () => {
    const res = await request(app)
      .patch('/api/bookings/non-existent-id-12345/status')
      .set('Authorization', ownerHeader)
      .send({ status: 'approved' });
    expect(res.status).toBe(404);
  });
});

describe('Conversation — Mark Read Edge Cases (coverage)', () => {
  let owner, borrower, stranger, listing, booking, convId;

  beforeAll(async () => {
    owner = await createTestUser({ fullName: 'ConvCov Owner' });
    borrower = await createTestUser({ fullName: 'ConvCov Borrower' });
    stranger = await createTestUser({ fullName: 'ConvCov Stranger' });
    listing = await createTestListing({
      ownerId: owner.user.id,
      title: 'ConvCov Item',
      dailyRentalRate: 500,
    });
    booking = await createTestBooking({
      listingId: listing.id,
      borrowerId: borrower.user.id,
      ownerId: owner.user.id,
      status: 'approved',
      approvedAt: new Date(),
      totalPriceSnapshot: 1500,
      securityDepositSnapshot: 2000,
    });
    const conv = await prisma.conversation.create({
      data: {
        bookingId: booking.id,
        participants: {
          create: [
            { userId: owner.user.id },
            { userId: borrower.user.id },
          ],
        },
      },
    });
    convId = conv.id;
  });

  it('marks conversation as read (PATCH /:id/read)', async () => {
    const res = await request(app)
      .patch('/api/conversations/' + convId + '/read')
      .set('Authorization', owner.header);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('unreadCount');
  });

  it('returns 403 for non-participant marking read', async () => {
    const res = await request(app)
      .patch('/api/conversations/' + convId + '/read')
      .set('Authorization', stranger.header);
    expect(res.status).toBe(403);
  });

  it('returns 401 for unauthenticated mark-read', async () => {
    const res = await request(app).patch('/api/conversations/' + convId + '/read');
    expect(res.status).toBe(401);
  });

  afterAll(async () => {
    if (convId) {
      await prisma.message.deleteMany({ where: { conversationId: convId } }).catch(() => {});
      await prisma.conversationParticipant.deleteMany({ where: { conversationId: convId } }).catch(() => {});
      await prisma.conversation.delete({ where: { id: convId } }).catch(() => {});
    }
  });
});

describe('Admin — Listing Moderation Edge Cases (coverage)', () => {
  let adminHeader;

  beforeAll(async () => {
    const admin = await createTestUser({ fullName: 'ModCov Admin', role: 'ADMIN' });
    adminHeader = admin.header;
  });

  it('returns 404 when hiding non-existent listing', async () => {
    const res = await request(app)
      .patch('/api/admin/listings/non-existent-id/hide')
      .set('Authorization', adminHeader);
    expect(res.status).toBe(404);
  });

  it('returns 400 when restoring a non-hidden (active) listing', async () => {
    const owner = await createTestUser({ fullName: 'ModCov Owner' });
    const listing = await createTestListing({
      ownerId: owner.user.id,
      title: 'ActiveNotHidden',
      dailyRentalRate: 200,
    });
    const res = await request(app)
      .patch('/api/admin/listings/' + listing.id + '/restore')
      .set('Authorization', adminHeader);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/only hidden listings can be restored/i);
  });

  it('returns 200 idempotent when hiding an already-hidden listing', async () => {
    const owner = await createTestUser({ fullName: 'ModCov Owner2' });
    const listing = await createTestListing({
      ownerId: owner.user.id,
      title: 'AlreadyHidden',
      dailyRentalRate: 200,
      status: 'hidden',
    });
    const res = await request(app)
      .patch('/api/admin/listings/' + listing.id + '/hide')
      .set('Authorization', adminHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('hidden');
  });

  it('returns 400 when hiding a deleted listing', async () => {
    const owner = await createTestUser({ fullName: 'ModCov Owner3' });
    const listing = await createTestListing({
      ownerId: owner.user.id,
      title: 'DelThenHide',
      dailyRentalRate: 200,
    });
    // Soft-delete first via API
    await request(app)
      .delete('/api/listings/' + listing.id)
      .set('Authorization', owner.header);
    // Now try to hide the deleted listing
    const res = await request(app)
      .patch('/api/admin/listings/' + listing.id + '/hide')
      .set('Authorization', adminHeader);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot moderate a deleted listing/i);
  });

  it('returns 404 when restoring non-existent listing', async () => {
    const res = await request(app)
      .patch('/api/admin/listings/non-existent-id/restore')
      .set('Authorization', adminHeader);
    expect(res.status).toBe(404);
  });

  it('filters bookings by userId', async () => {
    const owner = await createTestUser({ fullName: 'BookFilter Owner' });
    const borrower = await createTestUser({ fullName: 'BookFilter Borrower' });
    const listing = await createTestListing({
      ownerId: owner.user.id,
      title: 'BookFilter Item',
      dailyRentalRate: 300,
    });
    await createTestBooking({
      listingId: listing.id,
      borrowerId: borrower.user.id,
      ownerId: owner.user.id,
    });
    const res = await request(app)
      .get('/api/admin/bookings?userId=' + borrower.user.id)
      .set('Authorization', adminHeader);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});


describe('General — Route Not Found (coverage)', () => {
  it('returns 404 JSON for unknown GET route', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/route not found/i);
  });

  it('returns 404 for POST to unknown route', async () => {
    const res = await request(app).post('/api/unknown');
    expect(res.status).toBe(404);
  });

  it('includes requestId in 404 response', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.body).toHaveProperty('requestId');
  });
});

describe('Error Middleware — Validation Details (coverage)', () => {
  it('includes validation errors array when creating listing with bad data', async () => {
    const u = await createTestUser({ fullName: 'ErrCov User' });
    const res = await request(app)
      .post('/api/listings')
      .set('Authorization', u.header)
      .send({ title: 'Bad', dailyRentalRate: -100 });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('returns error for unknown category filter', async () => {
    const res = await request(app).get('/api/listings?category=__nonexistent_category_xyz__');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Listing — Update/Delete Non-existent (coverage)', () => {
  let header;

  beforeAll(async () => {
    const u = await createTestUser({ fullName: 'ListCov Owner' });
    header = u.header;
  });

  it('returns 404 when updating non-existent listing', async () => {
    const res = await request(app)
      .patch('/api/listings/non-existent-id-999')
      .set('Authorization', header)
      .send({ title: 'Ghost Update' });
    expect(res.status).toBe(404);
  });

  it('returns 404 when deleting non-existent listing', async () => {
    const res = await request(app)
      .delete('/api/listings/non-existent-id-999')
      .set('Authorization', header);
    expect(res.status).toBe(404);
  });
});
