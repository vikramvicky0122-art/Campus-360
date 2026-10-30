import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prismaClient.js';
import { createTestUser, cleanup } from './helpers/setup.js';

// Track API-created listing IDs for cleanup (not tracked by setup.js helpers)
const apiListings = [];

afterAll(async () => {
  // Delete API-created listings first to avoid FK constraint on user deletion
  for (const id of apiListings) {
    try {
      await prisma.listingImage.deleteMany({ where: { listingId: id } });
      await prisma.booking.deleteMany({ where: { listingId: id } });
      await prisma.listing.deleteMany({ where: { id } });
    } catch { /* already deleted by test */ }
  }
  await cleanup();
});

describe('GET /api/listings', () => {
  it('should return paginated active listings', async () => {
    const res = await request(app).get('/api/listings');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
  it('should support search query', async () => {
    const res = await request(app).get('/api/listings?q=test');
    expect(res.status).toBe(200);
  });
  it('should support category filter', async () => {
    const res = await request(app).get('/api/listings?category=Tech');
    expect(res.status).toBe(200);
  });
  it('should support pagination', async () => {
    const res = await request(app).get('/api/listings?page=1&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
  });
});

describe('GET /api/listings/my-listings', () => {
  let header;
  beforeAll(async () => {
    const u = await createTestUser({ fullName: 'MyList Owner' });
    header = u.header;
  });
  it('should require auth', async () => {
    const res = await request(app).get('/api/listings/my-listings');
    expect(res.status).toBe(401);
  });
  it('should return owned listings', async () => {
    const res = await request(app).get('/api/listings/my-listings').set('Authorization', header);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('POST /api/listings', () => {
  let header, owner;
  beforeAll(async () => {
    const o = await createTestUser({ fullName: 'Create Owner' });
    owner = o.user;
    header = o.header;
  });
  it('should require auth', async () => {
    const res = await request(app).post('/api/listings').send({ title: 'Test' });
    expect(res.status).toBe(401);
  });
  it('should create an active listing', async () => {
    const res = await request(app).post('/api/listings').set('Authorization', header).send({
      title: 'MacBook Pro', description: 'Great laptop.', category: 'Tech',
      condition: 'like-new', dailyRentalRate: 500, securityDeposit: 2000,
      retailPrice: 10000, minimumRentalDays: 1, preferredPickupZone: 'Library Cafe',
      images: [{ imageUrl: 'https://example.com/1.jpg', displayOrder: 0 }]
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.ownerId).toBe(owner.id);
    apiListings.push(res.body.data.id);
  });
  it('should reject missing fields', async () => {
    const res = await request(app).post('/api/listings').set('Authorization', header).send({ title: 'Only Title' });
    expect(res.status).toBe(400);
  });
  it('should reject deposit >= retail price', async () => {
    const res = await request(app).post('/api/listings').set('Authorization', header).send({
      title: 'Bad', description: 'Test', category: 'Tech', condition: 'good',
      dailyRentalRate: 500, securityDeposit: 10000, retailPrice: 5000,
      minimumRentalDays: 1, preferredPickupZone: 'Library Cafe'
    });
    expect(res.status).toBe(400);
  });
  it('should reject negative pricing', async () => {
    const res = await request(app).post('/api/listings').set('Authorization', header).send({
      title: 'Neg', description: 'Test', category: 'Tech', condition: 'good',
      dailyRentalRate: -100, securityDeposit: 2000, retailPrice: 5000,
      minimumRentalDays: 1, preferredPickupZone: 'Library Cafe'
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/listings/:id', () => {
  let header, listingId;
  beforeAll(async () => {
    const u = await createTestUser({ fullName: 'Get Owner' });
    header = u.header;
    const c = await request(app).post('/api/listings').set('Authorization', header).send({
      title: 'Single View', description: 'Test.', category: 'Books', condition: 'good',
      dailyRentalRate: 200, securityDeposit: 500, retailPrice: 2500,
      minimumRentalDays: 1, preferredPickupZone: 'Library Cafe'
    });
    listingId = c.body.data.id;
    apiListings.push(listingId);
  });
  it('should return listing by ID', async () => {
    const res = await request(app).get('/api/listings/' + listingId);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(listingId);
  });
  it('should 404 for non-existent', async () => {
    const res = await request(app).get('/api/listings/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/listings/:id', () => {
  let ownerHeader, strangerHeader, listingId;
  beforeAll(async () => {
    const o = await createTestUser({ fullName: 'Update Owner' });
    ownerHeader = o.header;
    const s = await createTestUser({ fullName: 'Stranger' });
    strangerHeader = s.header;
    const c = await request(app).post('/api/listings').set('Authorization', ownerHeader).send({
      title: 'Updatable', description: 'Original.', category: 'Sports', condition: 'fair',
      dailyRentalRate: 300, securityDeposit: 1000, retailPrice: 5000,
      minimumRentalDays: 1, preferredPickupZone: 'Central Garden'
    });
    listingId = c.body.data.id;
    apiListings.push(listingId);
  });
  it('should require auth', async () => {
    const res = await request(app).patch('/api/listings/' + listingId).send({ title: 'x' });
    expect(res.status).toBe(401);
  });
  it('should allow owner update', async () => {
    const res = await request(app).patch('/api/listings/' + listingId).set('Authorization', ownerHeader).send({ title: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated');
  });
  it('should reject non-owner', async () => {
    const res = await request(app).patch('/api/listings/' + listingId).set('Authorization', strangerHeader).send({ title: 'Stolen' });
    expect(res.status).toBe(403);
  });
  it('should reject invalid data', async () => {
    const res = await request(app).patch('/api/listings/' + listingId).set('Authorization', ownerHeader).send({ dailyRentalRate: -100 });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/listings/:id', () => {
  let ownerHeader, strangerHeader, listingId;
  beforeAll(async () => {
    const o = await createTestUser({ fullName: 'Delete Owner' });
    ownerHeader = o.header;
    const s = await createTestUser({ fullName: 'Delete Stranger' });
    strangerHeader = s.header;
    const c = await request(app).post('/api/listings').set('Authorization', ownerHeader).send({
      title: 'Deletable', description: 'Will be deleted.', category: 'General', condition: 'good',
      dailyRentalRate: 100, securityDeposit: 500, retailPrice: 2000,
      minimumRentalDays: 1, preferredPickupZone: 'Central Garden'
    });
    listingId = c.body.data.id;
    apiListings.push(listingId);
  });
  it('should require auth', async () => {
    const res = await request(app).delete('/api/listings/' + listingId);
    expect(res.status).toBe(401);
  });
  it('should reject non-owner', async () => {
    const res = await request(app).delete('/api/listings/' + listingId).set('Authorization', strangerHeader);
    expect(res.status).toBe(403);
  });
  it('should soft-delete by owner', async () => {
    const res = await request(app).delete('/api/listings/' + listingId).set('Authorization', ownerHeader);
    expect(res.status).toBe(200);
    // Verify gone
    const g = await request(app).get('/api/listings/' + listingId);
    expect(g.status).toBe(404);
  });
  it('should 404 for already deleted', async () => {
    const res = await request(app).delete('/api/listings/' + listingId).set('Authorization', ownerHeader);
    expect(res.status).toBe(404);
  });
});
