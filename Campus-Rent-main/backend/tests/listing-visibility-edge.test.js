import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/utils/prismaClient.js';
import { createTestUser, createTestListing, cleanup } from './helpers/setup.js';

afterAll(async () => {
  await cleanup();
});

describe('Listing Visibility', () => {
  var ctx = {};
  beforeAll(async () => {
    var u = await createTestUser({ fullName: 'Vis Owner' });
    ctx.oH = u.header;
    ctx.active = await createTestListing({ ownerId: u.user.id, title: 'Visible', dailyRentalRate: 100 });
    ctx.hidden = await createTestListing({ ownerId: u.user.id, title: 'Hidden', dailyRentalRate: 100, status: 'hidden' });
    var dl = await createTestListing({ ownerId: u.user.id, title: 'Del', dailyRentalRate: 100 });
    ctx.deleted = dl;
    await request(app).delete('/api/listings/' + dl.id).set('Authorization', ctx.oH);
  });
  it('market includes active', async () => {
    var res = await request(app).get('/api/listings');
    var ids = res.body.data.map(function(l){return l.id;});
    expect(ids).toContain(ctx.active.id);
  });
  it('market excludes hidden', async () => {
    var res = await request(app).get('/api/listings');
    var ids = res.body.data.map(function(l){return l.id;});
    expect(ids).not.toContain(ctx.hidden.id);
  });
  it('market excludes deleted', async () => {
    var res = await request(app).get('/api/listings');
    var ids = res.body.data.map(function(l){return l.id;});
    expect(ids).not.toContain(ctx.deleted.id);
  });
  it('hidden by direct ID', async () => {
    var res = await request(app).get('/api/listings/' + ctx.hidden.id);
    expect(res.status).toBe(200);
  });
  it('deleted by ID returns 404', async () => {
    var res = await request(app).get('/api/listings/' + ctx.deleted.id);
    expect(res.status).toBe(404);
  });
  it('no pagination without params', async () => {
    var res = await request(app).get('/api/listings');
    expect(res.body.pagination).toBeUndefined();
  });
});