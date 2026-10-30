import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { registerSocketHandlers } from '../src/socket/handler.js';
import { socketAuth } from '../src/socket/auth.js';
import { createTestUser, createTestListing, createTestBooking, cleanup } from './helpers/setup.js';
import prisma from '../src/utils/prismaClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Online Presence (Socket.IO)', () => {
  let server, io, clientUrl;
  let userA, userB, userC, listing, booking;
  let conv;

  beforeAll(async () => {
    userA = await createTestUser({ fullName: 'Presence A' });
    userB = await createTestUser({ fullName: 'Presence B' });
    userC = await createTestUser({ fullName: 'Presence C' });

    listing = await createTestListing({
      ownerId: userA.user.id,
      dailyRentalRate: 500,
      securityDeposit: 2000,
      retailPrice: 10000,
    });

    booking = await createTestBooking({
      listingId: listing.id,
      borrowerId: userB.user.id,
      ownerId: userA.user.id,
      status: 'approved',
      approvedAt: new Date(),
      totalPriceSnapshot: 1500,
      securityDepositSnapshot: 2000,
    });

    conv = await prisma.conversation.create({
      data: {
        bookingId: booking.id,
        participants: {
          create: [
            { userId: userA.user.id },
            { userId: userB.user.id }
          ]
        }
      }
    });

    const httpServer = createServer();
    io = new Server(httpServer, { cors: { origin: '*' } });
    io.use(socketAuth);
    registerSocketHandlers(io);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        clientUrl = 'http://localhost:' + addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    io?.close();
    if (conv) {
      await prisma.message.deleteMany({ where: { conversationId: conv.id } });
      await prisma.conversationParticipant.deleteMany({ where: { conversationId: conv.id } });
      await prisma.conversation.delete({ where: { id: conv.id } });
    }
    await cleanup();
  });

  const createClient = async (userId) => {
    const token = jwt.sign({ sub: userId, role: 'USER' }, JWT_SECRET, { expiresIn: '1h' });
    const socket = Client(clientUrl, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });
    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    return socket;
  };

  describe('presence:update on connect', () => {
    it('should broadcast presence:update with isOnline=true when user connects', async () => {
      const socketB = await createClient(userB.user.id);

      const presencePromise = new Promise((resolve) => {
        socketB.on('presence:update', (data) => {
          if (data.userId === userA.user.id && data.isOnline) {
            resolve(data);
          }
        });
      });

      const socketA = await createClient(userA.user.id);

      const presenceData = await presencePromise;
      expect(presenceData.userId).toBe(userA.user.id);
      expect(presenceData.isOnline).toBe(true);

      socketA.close();
      socketB.close();
    });

    it('should NOT broadcast presence to users who do not share a conversation', async () => {
      const socketC = await createClient(userC.user.id);

      let received = false;
      socketC.on('presence:update', () => {
        received = true;
      });

      const socketA = await createClient(userA.user.id);
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(received).toBe(false);

      socketA.close();
      socketC.close();
    });
  });

  describe('presence:update on disconnect', () => {
    it('should broadcast presence:update with isOnline=false when user disconnects', async () => {
      const socketB = await createClient(userB.user.id);
      const socketA = await createClient(userA.user.id);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const presencePromise = new Promise((resolve) => {
        socketB.on('presence:update', (data) => {
          if (data.userId === userA.user.id && !data.isOnline) {
            resolve(data);
          }
        });
      });

      socketA.close();

      const presenceData = await presencePromise;
      expect(presenceData.userId).toBe(userA.user.id);
      expect(presenceData.isOnline).toBe(false);

      socketB.close();
    });
  });
});
