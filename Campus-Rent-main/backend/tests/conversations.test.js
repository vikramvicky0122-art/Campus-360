import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createTestListing, createTestBooking, cleanup } from './helpers/setup.js';
import prisma from '../src/utils/prismaClient.js';

describe('Conversations API', () => {
  let owner, borrower, stranger, listing, booking;

  beforeAll(async () => {
    // Create owner, borrower, and a stranger user
    owner = await createTestUser({ fullName: 'Chat Owner' });
    borrower = await createTestUser({ fullName: 'Chat Borrower' });
    stranger = await createTestUser({ fullName: 'Stranger' });

    // Create a listing owned by owner
    listing = await createTestListing({
      ownerId: owner.user.id,
      dailyRentalRate: 500,
      securityDeposit: 2000,
      retailPrice: 10000,
    });

    // Create a booking and approve it to trigger conversation creation
    booking = await createTestBooking({
      listingId: listing.id,
      borrowerId: borrower.user.id,
      ownerId: owner.user.id,
      status: 'approved',
      approvedAt: new Date(),
      totalPriceSnapshot: 1500,
      securityDepositSnapshot: 2000,
    });

    // Manually create a conversation for the approved booking
    // since the service auto-creation happens via the booking approval flow
    const existingConv = await prisma.conversation.findUnique({
      where: { bookingId: booking.id }
    });
    if (!existingConv) {
      await prisma.conversation.create({
        data: {
          bookingId: booking.id,
          participants: {
            create: [
              { userId: owner.user.id },
              { userId: borrower.user.id }
            ]
          }
        }
      });
    }

    // Add a test message
    const conv = await prisma.conversation.findUnique({
      where: { bookingId: booking.id }
    });
    if (conv) {
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: owner.user.id,
          content: 'Hello, this is a test message about the rental.'
        }
      });

      // Update lastMessageAt
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date() }
      });
    }
  });

  afterAll(async () => {
    // Cleanup conversation, messages, participants first
    const conv = await prisma.conversation.findUnique({
      where: { bookingId: booking.id }
    });
    if (conv) {
      await prisma.message.deleteMany({ where: { conversationId: conv.id } });
      await prisma.conversationParticipant.deleteMany({ where: { conversationId: conv.id } });
      await prisma.conversation.delete({ where: { id: conv.id } });
    }
    await cleanup();
  });

  // ── GET /api/conversations ────────────────────────────────────────
  describe('GET /api/conversations', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/conversations');
      expect(res.status).toBe(401);
    });

    it('should return conversations for an authenticated participant', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', owner.header);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const conv = res.body.data[0];
      expect(conv).toHaveProperty('id');
      expect(conv).toHaveProperty('bookingId');
      expect(conv).toHaveProperty('booking');
      expect(conv).toHaveProperty('otherUser');
      expect(conv.otherUser).toHaveProperty('id');
      expect(conv.otherUser).toHaveProperty('fullName');
    });

    it('should return last message preview', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', owner.header);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      
      const conv = res.body.data[0];
      expect(conv.lastMessage).toBeDefined();
      expect(conv.lastMessage.content).toBe('Hello, this is a test message about the rental.');
    });

    it('should return correct otherUser for borrower perspective', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', borrower.header);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const conv = res.body.data[0];
      expect(conv.otherUser.id).toBe(owner.user.id);
      expect(conv.otherUser.fullName).toBe('Chat Owner');
    });

    it('should return empty array for user with no conversations', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', stranger.header);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  // ── GET /api/conversations/:id/messages ───────────────────────────
  describe('GET /api/conversations/:id/messages', () => {
    let convId;

    beforeAll(async () => {
      const conv = await prisma.conversation.findUnique({
        where: { bookingId: booking.id }
      });
      convId = conv.id;
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get(`/api/conversations/${convId}/messages`);
      expect(res.status).toBe(401);
    });

    it('should return messages for a participant', async () => {
      const res = await request(app)
        .get(`/api/conversations/${convId}/messages`)
        .set('Authorization', owner.header);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const msg = res.body.data[0];
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('content');
      expect(msg).toHaveProperty('senderId');
      expect(msg).toHaveProperty('createdAt');
      expect(msg.sender).toHaveProperty('id');
      expect(msg.sender).toHaveProperty('fullName');
    });

    it('should return 403 for non-participant', async () => {
      const res = await request(app)
        .get(`/api/conversations/${convId}/messages`)
        .set('Authorization', stranger.header);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should support cursor-based pagination', async () => {
      const res = await request(app)
        .get(`/api/conversations/${convId}/messages?limit=1`)
        .set('Authorization', owner.header);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(1);
      expect(res.body).toHaveProperty('nextCursor');
      expect(res.body).toHaveProperty('hasMore');
    });
  });
});
