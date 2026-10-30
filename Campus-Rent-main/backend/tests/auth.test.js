import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

const TEST_PASSWORD = 'SecurePass@123';

// Unique per run so tests don't collide with leftover DB rows
const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const TEST_EMAIL = `test_${uniqueSuffix}@nitrr.ac.in`;
const TEST_NAME = 'Integration Test User';

/**
 * Auth Integration Tests
 *
 * PREREQUISITES:
 *   - DATABASE_URL must point to a reachable PostgreSQL database
 *   - JWT_SECRET must be set in environment or .env
 *   - Database must have migrations applied (npx prisma migrate deploy)
 *
 * NOTE: No database cleanup is performed. Each run uses a unique email
 *       so test data persists across runs intentionally.
 */
describe('Auth — POST /api/auth/signup', () => {
  it('should sign up a new user and return token + user', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        fullName: TEST_NAME,
        collegeEmail: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveProperty('token');
    expect(typeof res.body.data.token).toBe('string');

    expect(res.body.data.user).toMatchObject({
      fullName: TEST_NAME,
      collegeEmail: TEST_EMAIL,
    });
    expect(res.body.data.user).toHaveProperty('id');
  });

  it('should reject a duplicate email with 409', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        fullName: TEST_NAME,
        collegeEmail: TEST_EMAIL,  // same email as previous test
        password: TEST_PASSWORD,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('should reject non-campus email domains (validation error)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        fullName: 'Gmail User',
        collegeEmail: `test_${uniqueSuffix}@gmail.com`,
        password: TEST_PASSWORD,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed.');
    expect(res.body.errors).toBeInstanceOf(Array);
    expect(res.body.errors.some((e) => e.message.includes('nitrr.ac.in'))).toBe(true);
  });

  it('should reject weak passwords (validation error)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        fullName: 'Weak Password User',
        collegeEmail: `weak_${uniqueSuffix}@nitrr.ac.in`,
        password: 'short',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed.');
    expect(res.body.errors).toBeInstanceOf(Array);
  });
});

describe('Auth — POST /api/auth/login', () => {
  it('should log in with valid credentials and return token + user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        collegeEmail: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data).toHaveProperty('token');
    expect(typeof res.body.data.token).toBe('string');

    expect(res.body.data.user).toMatchObject({
      collegeEmail: TEST_EMAIL,
    });
  });

  it('should reject incorrect password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        collegeEmail: TEST_EMAIL,
        password: 'WrongPassword@999',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('should reject non-existent email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        collegeEmail: `nonexistent_${uniqueSuffix}@nitrr.ac.in`,
        password: TEST_PASSWORD,
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });
});

describe('Protected Route Access', () => {
  it('should return 401 for requests without a token', async () => {
    const res = await request(app)
      .get('/api/conversations');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/token/i);
  });

  it('should return 401 for invalid/expired tokens', async () => {
    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', 'Bearer invalid-token-here');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid|expired/i);
  });

  it('should return 200 for authenticated requests', async () => {
    // Login to get a valid token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        collegeEmail: TEST_EMAIL,
        password: TEST_PASSWORD,
      });

    const token = loginRes.body.data.token;
    expect(token).toBeDefined();

    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
