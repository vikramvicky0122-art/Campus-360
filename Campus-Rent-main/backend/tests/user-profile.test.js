import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, cleanup } from './helpers/setup.js';

afterAll(async () => { await cleanup(); });

describe('GET /api/users/me', () => {
  var u, h;
  beforeAll(async () => {
    var r = await createTestUser({ fullName: 'MeUser', department: 'Physics', yearOfStudy: 'Senior' });
    u = r.user; h = r.header;
  });
  it('requires auth', async () => {
    var res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
  it('returns profile with listings', async () => {
    var res = await request(app).get('/api/users/me').set('Authorization', h);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(u.id);
    expect(res.body.data.fullName).toBe('MeUser');
    expect(res.body.data.role).toBe('USER');
    expect(Array.isArray(res.body.data.listings)).toBe(true);
    expect(typeof res.body.data.borrowingCount).toBe('number');
    expect(res.body.data.passwordHash).toBeUndefined();
  });
});

describe('GET /api/users/:id', () => {
  var u;
  beforeAll(async () => {
    var r = await createTestUser({ fullName: 'PubUser', bio: 'Hello' });
    u = r.user;
  });
  it('public no auth needed', async () => {
    var res = await request(app).get('/api/users/' + u.id);
    expect(res.status).toBe(200);
    expect(res.body.data.collegeEmail).toBeUndefined();
  });
  it('non-existent returns 404', async () => {
    var res = await request(app).get('/api/users/nonexistent-id');
    expect(res.status).toBe(404);
  });
});