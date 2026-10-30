import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { registerSocketHandlers } from '../src/socket/handler.js';
import { socketAuth } from '../src/socket/auth.js';
import { createTestUser, createTestListing, createTestBooking, cleanup } from './helpers/setup.js';
import prisma from '../src/utils/prismaClient.js';

const PORT = 0; // let OS assign a port
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Typing Indicators (Socket.IO)', () => {
  let server, io, clientUrl;
  let owner, borrower, stranger, listing, booking, conv;
  let ownerSocket, borrowerSocket, strangerSocket;

  beforeAll(async () => {
    // Create test data
    owner = await createTestUser({ fullName: 'Typing Owner' });
    borrower = await createTestUser({ fullName: 'Typing Borrower' });
    stranger = await createTestUser({ fullName: 'Typing Stranger' });

    listing = await createTestListing({
      ownerId: owner.user.id,
      dailyRentalRate: 500,
      securityDeposit: 2000,
      retailPrice: 10000,
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

    conv = await prisma.conversation.create({
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

    // Create HTTP server and Socket.IO
    const httpServer = createServer();
    io = new Server(httpServer, {
      cors: { origin: '*' },
    });

    io.use(socketAuth);
    registerSocketHandlers(io);

    await new Promise((resolve) => {
      httpServer.listen(PORT, () => {
        const addr = httpServer.address();
        clientUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    ownerSocket?.close();
    borrowerSocket?.close();
    strangerSocket?.close();
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

  describe('typing:start', () => {
    it('should broadcast typing:update with isTyping=true to participants', async () => {
      ownerSocket = await createClient(owner.user.id);
      borrowerSocket = await createClient(borrower.user.id);

      // Both join the conversation room
      await Promise.all([
        new Promise((resolve) => ownerSocket.emit('conversation:join', { conversationId: conv.id }, resolve)),
        new Promise((resolve) => borrowerSocket.emit('conversation:join', { conversationId: conv.id }, resolve)),
      ]);

      // Owner emits typing:start
      const typingPromise = new Promise((resolve) => {
        borrowerSocket.on('typing:update', (data) => {
          resolve(data);
        });
      });

      await new Promise((resolve) => {
        ownerSocket.emit('typing:start', { conversationId: conv.id }, (response) => {
          expect(response.success).toBe(true);
          resolve();
        });
      });

      const typingData = await typingPromise;
      expect(typingData.conversationId).toBe(conv.id);
      expect(typingData.userId).toBe(owner.user.id);
      expect(typingData.isTyping).toBe(true);
    });

    it('should reject unauthorized users', async () => {
      strangerSocket = await createClient(stranger.user.id);

      const response = await new Promise((resolve) => {
        strangerSocket.emit('typing:start', { conversationId: conv.id }, (res) => {
          resolve(res);
        });
      });

      expect(response.error).toBe('NOT_AUTHORIZED');
    });

    it('should reject invalid conversationId', async () => {
      const response = await new Promise((resolve) => {
        ownerSocket.emit('typing:start', { conversationId: '' }, (res) => {
          resolve(res);
        });
      });

      expect(response.error).toBe('INVALID_INPUT');
    });
  });

  describe('typing:stop', () => {
    it('should broadcast typing:update with isTyping=false', async () => {
      const typingPromise = new Promise((resolve) => {
        borrowerSocket.on('typing:update', (data) => {
          if (!data.isTyping) {
            resolve(data);
          }
        });
      });

      await new Promise((resolve) => {
        ownerSocket.emit('typing:stop', { conversationId: conv.id }, (response) => {
          expect(response.success).toBe(true);
          resolve();
        });
      });

      const typingData = await typingPromise;
      expect(typingData.conversationId).toBe(conv.id);
      expect(typingData.userId).toBe(owner.user.id);
      expect(typingData.isTyping).toBe(false);
    });

    it('should reject typing:stop for unauthorized users', async () => {
      const response = await new Promise((resolve) => {
        strangerSocket.emit('typing:stop', { conversationId: conv.id }, (res) => {
          resolve(res);
        });
      });

      expect(response.error).toBe('NOT_AUTHORIZED');
    });

    it('should reject invalid conversationId for typing:stop', async () => {
      const response = await new Promise((resolve) => {
        ownerSocket.emit('typing:stop', { conversationId: 123 }, (res) => {
          resolve(res);
        });
      });

      expect(response.error).toBe('INVALID_INPUT');
    });
  });

  describe('auto-stop behavior', () => {
    it('should automatically emit typing:stop after inactivity timeout', async () => {
      const autoStopPromise = new Promise((resolve) => {
        let receivedStart = false;
        borrowerSocket.on('typing:update', (data) => {
          if (data.isTyping && data.userId === owner.user.id) {
            receivedStart = true;
          }
          // After receiving isTyping=false (auto-stop)
          if (receivedStart && !data.isTyping && data.userId === owner.user.id) {
            resolve(data);
          }
        });
      });

      await new Promise((resolve) => {
        ownerSocket.emit('typing:start', { conversationId: conv.id }, resolve);
      });

      // Don't emit typing:stop, wait for auto-stop (3s timeout)
      const stopData = await autoStopPromise;
      expect(stopData.conversationId).toBe(conv.id);
      expect(stopData.userId).toBe(owner.user.id);
      expect(stopData.isTyping).toBe(false);
    }, 10000); // longer timeout for the 3s auto-stop
  });

  describe('disconnect behavior (P1.2)', () => {
    it('should broadcast typing:update with isTyping=false when user disconnects while typing', async () => {
      // Create fresh sockets for this test
      const discOwnerSocket = await createClient(owner.user.id);
      const discBorrowerSocket = await createClient(borrower.user.id);

      // Both join the conversation room
      await Promise.all([
        new Promise((resolve) => discOwnerSocket.emit('conversation:join', { conversationId: conv.id }, resolve)),
        new Promise((resolve) => discBorrowerSocket.emit('conversation:join', { conversationId: conv.id }, resolve)),
      ]);

      // Owner emits typing:start
      await new Promise((resolve) => {
        discOwnerSocket.emit('typing:start', { conversationId: conv.id }, resolve);
      });

      // Borrow socket listens for typing:stop
      const stopPromise = new Promise((resolve) => {
        discBorrowerSocket.on('typing:update', (data) => {
          if (!data.isTyping && data.userId === owner.user.id) {
            resolve(data);
          }
        });
      });

      // Owner disconnects — should trigger typing:stop broadcast
      discOwnerSocket.close();

      const stopData = await stopPromise;
      expect(stopData.conversationId).toBe(conv.id);
      expect(stopData.userId).toBe(owner.user.id);
      expect(stopData.isTyping).toBe(false);

      discBorrowerSocket.close();
    }, 10000);
  });
});
