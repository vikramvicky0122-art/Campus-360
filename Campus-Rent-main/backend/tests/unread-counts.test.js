import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, createTestListing, createTestBooking, cleanup } from './helpers/setup.js';
import prisma from '../src/utils/prismaClient.js';

describe('Unread Counts API', () => {
  let owner, borrower, stranger, listing, booking, conv;

  beforeAll(async () => {
    // Create users
    owner = await createTestUser({ fullName: 'Unread Owner' });
    borrower = await createTestUser({ fullName: 'Unread Borrower' });
    stranger = await createTestUser({ fullName: 'Unread Stranger' });

    // Create listing owned by owner
    listing = await createTestListing({
      ownerId: owner.user.id,
      dailyRentalRate: 500,
      securityDeposit: 2000,
      retailPrice: 10000,
    });

    // Create booking
    booking = await createTestBooking({
      listingId: listing.id,
      borrowerId: borrower.user.id,
      ownerId: owner.user.id,
      status: 'approved',
      approvedAt: new Date(),
      totalPriceSnapshot: 1500,
      securityDepositSnapshot: 2000,
    });

    // Manually create conversation
    conv = await prisma.conversation.create({
      data: {
        bookingId: booking.id,
        participants: {
          create: [
            { userId: owner.user.id, lastReadAt: new Date() },
            { userId: borrower.user.id, lastReadAt: new Date() }
          ]
        }
      }
    });
  });

  afterAll(async () => {
    if (conv) {
      await prisma.message.deleteMany({ where: { conversationId: conv.id } });
      await prisma.conversationParticipant.deleteMany({ where: { conversationId: conv.id } });
      await prisma.conversation.delete({ where: { id: conv.id } });
    }
    await cleanup();
  });

  // ── PATCH /api/conversations/:id/read ──────────────────────────────
  describe('PATCH /api/conversations/:id/read', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).patch(`/api/conversations/${conv.id}/read`);
      expect(res.status).toBe(401);
    });

    it('should return 403 for non-participant', async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conv.id}/read`)
        .set('Authorization', stranger.header);
      expect(res.status).toBe(403);
    });

    it('should succeed for a participant and return unreadCount', async () => {
      const res = await request(app)
        .patch(`/api/conversations/${conv.id}/read`)
        .set('Authorization', owner.header);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('unreadCount');
      expect(typeof res.body.data.unreadCount).toBe('number');
    });
  });

  // ── Unread count increments ───────────────────────────────────────
  describe('Unread count behavior', () => {
    it('should show 0 unread when both users have read everything', async () => {
      // Both lastReadAt was set to now; no messages exist after that
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', owner.header);

      expect(res.status).toBe(200);
      const ownerConv = res.body.data.find(c => c.id === conv.id);
      expect(ownerConv).toBeDefined();
      expect(ownerConv.unreadCount).toBe(0);
    });

    it('should increment unread count for receiver when a message is sent', async () => {
      // Owner sends a message to borrower
      await prisma.message.create({
        data: {
          conversationId: conv.id,
          senderId: owner.user.id,
          content: 'Hey, this is a new message for you!'
        }
      });
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date() }
      });

      // Borrower should have 1 unread (since lastReadAt is before this message)
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', borrower.header);

      expect(res.status).toBe(200);
      const convData = res.body.data.find(c => c.id === conv.id);
      expect(convData).toBeDefined();
      expect(convData.unreadCount).toBe(1);
    });

    it('should NOT count sender\'s own messages as unread', async () => {
      // Owner checks their conversations - they sent the message, so it should be 0
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', owner.header);

      expect(res.status).toBe(200);
      const convData = res.body.data.find(c => c.id === conv.id);
      expect(convData).toBeDefined();
      expect(convData.unreadCount).toBe(0);
    });

    it('should reset unread count when conversation is opened via PATCH /read', async () => {
      // Borrower marks conversation as read
      const readRes = await request(app)
        .patch(`/api/conversations/${conv.id}/read`)
        .set('Authorization', borrower.header);

      expect(readRes.status).toBe(200);

      // Now borrower should have 0 unread
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', borrower.header);

      expect(res.status).toBe(200);
      const convData = res.body.data.find(c => c.id === conv.id);
      expect(convData).toBeDefined();
      expect(convData.unreadCount).toBe(0);
    });

    it('should show correct unread count for multiple messages', async () => {
      // Send 3 more messages from owner
      for (let i = 0; i < 3; i++) {
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            senderId: owner.user.id,
            content: `Unread message ${i + 1}`
          }
        });
      }
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date() }
      });

      // Borrower should have 3 unread (since we reset lastReadAt earlier)
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', borrower.header);

      expect(res.status).toBe(200);
      const convData = res.body.data.find(c => c.id === conv.id);
      expect(convData).toBeDefined();
      expect(convData.unreadCount).toBe(3);
    });

    it('should still enforce auth for non-participant conversations', async () => {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', stranger.header);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });
});
