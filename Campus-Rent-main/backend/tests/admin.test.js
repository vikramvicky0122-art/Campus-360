import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createTestListing, cleanup } from './helpers/setup.js';

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

afterAll(async () => {
  await cleanup();
});

describe('Admin Authorization', () => {
  let adminUser, adminHeader, regularUser, regularHeader;

  beforeAll(async () => {
    adminUser = await createTestUser({ fullName: 'Admin User', role: 'ADMIN' });
    adminHeader = adminUser.header;
    regularUser = await createTestUser({ fullName: 'Regular User' });
    regularHeader = regularUser.header;
  });

  it('should reject unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('should reject non-admin users with 403', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', regularHeader);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/admin access required/i);
  });

  it('should allow admin users to access admin endpoints', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', adminHeader);
    expect(res.status).toBe(200);
  });
});

describe('Admin Dashboard - GET /api/admin/stats', () => {
  let adminHeader;

  beforeAll(async () => {
    const admin = await createTestUser({ fullName: 'Stats Admin', role: 'ADMIN' });
    adminHeader = admin.header;
  });

  it('should return platform statistics', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', adminHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalUsers');
    expect(res.body.data).toHaveProperty('totalListings');
    expect(res.body.data).toHaveProperty('activeListings');
    expect(res.body.data).toHaveProperty('totalBookings');
    expect(res.body.data).toHaveProperty('activeBookings');
    expect(res.body.data).toHaveProperty('completedBookings');
    expect(typeof res.body.data.totalUsers).toBe('number');
    expect(typeof res.body.data.totalListings).toBe('number');
  });
});

describe('Admin Users - GET /api/admin/users', () => {
  let adminHeader;

  beforeAll(async () => {
    const admin = await createTestUser({ fullName: 'Users Admin', role: 'ADMIN' });
    adminHeader = admin.header;
  });

  it('should return paginated users list', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', adminHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('limit');
    expect(res.body.pagination).toHaveProperty('totalPages');

    if (res.body.data.length > 0) {
      const user = res.body.data[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('fullName');
      expect(user).toHaveProperty('collegeEmail');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('createdAt');
    }
  });

  it('should support search by email', async () => {
    const res = await request(app)
      .get('/api/admin/users?q=admin')
      .set('Authorization', adminHeader);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should support pagination', async () => {
    const res = await request(app)
      .get('/api/admin/users?page=1&limit=5')
      .set('Authorization', adminHeader);

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });
});

describe('Admin Bookings - GET /api/admin/bookings', () => {
  let adminHeader;

  beforeAll(async () => {
    const admin = await createTestUser({ fullName: 'Bookings Admin', role: 'ADMIN' });
    adminHeader = admin.header;
  });

  it('should return paginated bookings list', async () => {
    const res = await request(app)
      .get('/api/admin/bookings')
      .set('Authorization', adminHeader);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty('total');

    if (res.body.data.length > 0) {
      const booking = res.body.data[0];
      expect(booking).toHaveProperty('id');
      expect(booking).toHaveProperty('listing');
      expect(booking).toHaveProperty('borrower');
      expect(booking).toHaveProperty('ownerId');
    }
  });

  it('should support status filtering', async () => {
    const res = await request(app)
      .get('/api/admin/bookings?status=requested')
      .set('Authorization', adminHeader);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('Admin Listing Moderation', () => {
  let adminHeader, ownerUser, listing;

  beforeAll(async () => {
    ownerUser = await createTestUser({ fullName: 'Listing Owner' });
    const admin = await createTestUser({ fullName: 'Mod Admin', role: 'ADMIN' });
    adminHeader = admin.header;

    listing = await createTestListing({
      ownerId: ownerUser.user.id,
      title: 'Moderatable Item',
      dailyRentalRate: 300,
      securityDeposit: 1000,
      retailPrice: 5000,
    });
  });

  it('should hide a listing (PATCH /api/admin/listings/:id/hide)', async () => {
    const res = await request(app)
      .patch('/api/admin/listings/' + listing.id + '/hide')
      .set('Authorization', adminHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('hidden');
  });

  it('should restore a listing (PATCH /api/admin/listings/:id/restore)', async () => {
    const res = await request(app)
      .patch('/api/admin/listings/' + listing.id + '/restore')
      .set('Authorization', adminHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });

  it('should reject moderation from non-admin users', async () => {
    const regularUser = await createTestUser({ fullName: 'Regular Mod Tester' });
    const res = await request(app)
      .patch('/api/admin/listings/' + listing.id + '/hide')
      .set('Authorization', regularUser.header);

    expect(res.status).toBe(403);
  });
});
