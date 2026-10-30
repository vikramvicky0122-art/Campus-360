import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import prisma from '../src/utils/prismaClient.js';
import app from '../src/app.js';
import { createTestUser, cleanup } from './helpers/setup.js';

afterAll(async () => { await cleanup(); });

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-chars-long!!';

describe('Auth Middleware - Edge Cases', () => {
  it('missing token returns 401', async () => {
    const res = await request(app).get('/api/listings/my-listings');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token is required/i);
  });

  it('malformed token returns 401', async () => {
    const res = await request(app).get('/api/listings/my-listings').set('Authorization', 'Bearer invalid-jwt');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired token/i);
  });

  it('missing sub claim returns 401', async () => {
    const token = jwt.sign({ email: 'test@nitrr.ac.in' }, JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app).get('/api/listings/my-listings').set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid token payload/i);
  });

  it('expired token returns 401', async () => {
    const { user } = await createTestUser({ fullName: 'Expired User' });
    const token = jwt.sign({ sub: user.id, email: user.collegeEmail }, JWT_SECRET, { expiresIn: '0s' });
    await new Promise(r => setTimeout(r, 1100));
    const res = await request(app).get('/api/listings/my-listings').set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid or expired token/i);
  }, 10000);

  it('deleted user token returns 401', async () => {
    const { user, token } = await createTestUser({ fullName: 'Del User' });
    await prisma.booking.deleteMany({ where: { borrowerId: user.id } });
    await prisma.listingImage.deleteMany({ where: { listing: { ownerId: user.id } } });
    await prisma.listing.deleteMany({ where: { ownerId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    const res = await request(app).get('/api/listings/my-listings').set('Authorization', 'Bearer ' + token);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/authentication failed/i);
  });

  it('empty Bearer token returns 401', async () => {
    const res = await request(app).get('/api/listings/my-listings').set('Authorization', 'Bearer ');
    expect(res.status).toBe(401);
  });
});
