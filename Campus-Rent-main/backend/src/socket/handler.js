import conversationService from '../services/conversationService.js';
import prisma from '../utils/prismaClient.js';
import logger from '../utils/logger.js';

/**
 * Maps userId → Set<socketId> for presence tracking (simple in-memory).
 */
const userSockets = new Map();

/**
 * Maps conversationId → { userId: typingTimeout } for typing indicator state.
 * Stores the timeout ID so we can clear it on typing:stop.
 */
const typingTimers = new Map();

const TYPING_TIMEOUT_MS = 3000;

/**
 * Register all chat-related socket event handlers.
 *
 * @param {import('socket.io').Server} io
 */
export const registerSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    const { userId } = socket;
    logger.info({ socketId: socket.id, userId }, 'Socket connected');

    // Track user connection
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    const wasOffline = !isUserOnline(userId);
    userSockets.get(userId).add(socket.id);

    // Join the user to their personal room so we can send targeted events
    socket.join(`user:${userId}`);

    // If user was offline and now has a connection, broadcast presence
    if (wasOffline) {
      broadcastPresence(io, userId, true).catch((err) => {
        logger.error({ err, userId }, 'Failed to broadcast presence:online');
      });
    }

    // ── conversation:join ──────────────────────────────────────────
    socket.on('conversation:join', async ({ conversationId }, callback) => {
      try {
        if (!conversationId || typeof conversationId !== 'string') {
          return callback?.({ error: 'INVALID_INPUT', message: 'conversationId is required.' });
        }

        const isParticipant = await conversationService.isParticipant(conversationId, userId);
        if (!isParticipant) {
          return callback?.({ error: 'NOT_AUTHORIZED', message: 'You are not a participant in this conversation.' });
        }

        await socket.join(`conv:${conversationId}`);
        logger.debug({ userId, conversationId }, 'User joined conversation room');
        callback?.({ success: true });
      } catch (err) {
        logger.error({ err, userId, conversationId }, 'Error joining conversation');
        callback?.({ error: 'INTERNAL_ERROR', message: 'Failed to join conversation.' });
      }
    });

    // ── conversation:leave ─────────────────────────────────────────
    socket.on('conversation:leave', ({ conversationId }, callback) => {
      if (!conversationId) {
        return callback?.({ error: 'INVALID_INPUT', message: 'conversationId is required.' });
      }
      socket.leave(`conv:${conversationId}`);
      callback?.({ success: true });
    });

    // ── typing:start ───────────────────────────────────────────────
    socket.on('typing:start', async ({ conversationId }, callback) => {
      try {
        if (!conversationId || typeof conversationId !== 'string') {
          return callback?.({ error: 'INVALID_INPUT', message: 'conversationId is required.' });
        }

        // Verify user is a participant
        const isParticipant = await conversationService.isParticipant(conversationId, userId);
        if (!isParticipant) {
          return callback?.({ error: 'NOT_AUTHORIZED', message: 'You are not a participant in this conversation.' });
        }

        // Clear any existing timeout for this user in this conversation
        const convTyping = typingTimers.get(conversationId);
        if (convTyping && convTyping[userId]) {
          clearTimeout(convTyping[userId]);
        }

        // Set auto-stop timeout
        const timeoutId = setTimeout(() => {
          const conv = typingTimers.get(conversationId);
          if (conv && conv[userId]) {
            delete conv[userId];
            if (Object.keys(conv).length === 0) {
              typingTimers.delete(conversationId);
            }
          }
          // Broadcast typing:stop to the conversation room
          io.to(`conv:${conversationId}`).emit('typing:update', {
            conversationId,
            userId,
            isTyping: false
          });
        }, TYPING_TIMEOUT_MS);

        if (!typingTimers.has(conversationId)) {
          typingTimers.set(conversationId, {});
        }
        typingTimers.get(conversationId)[userId] = timeoutId;

        // Broadcast typing:start to the conversation room
        io.to(`conv:${conversationId}`).emit('typing:update', {
          conversationId,
          userId,
          isTyping: true
        });

        callback?.({ success: true });
      } catch (err) {
        logger.error({ err, userId, conversationId }, 'Error in typing:start');
        callback?.({ error: 'INTERNAL_ERROR', message: 'Failed to process typing event.' });
      }
    });

    // ── typing:stop ────────────────────────────────────────────────
    socket.on('typing:stop', async ({ conversationId }, callback) => {
      try {
        if (!conversationId || typeof conversationId !== 'string') {
          return callback?.({ error: 'INVALID_INPUT', message: 'conversationId is required.' });
        }

        // Verify user is a participant
        const isParticipant = await conversationService.isParticipant(conversationId, userId);
        if (!isParticipant) {
          return callback?.({ error: 'NOT_AUTHORIZED', message: 'You are not a participant in this conversation.' });
        }

        // Clear timeout
        const convTyping = typingTimers.get(conversationId);
        if (convTyping && convTyping[userId]) {
          clearTimeout(convTyping[userId]);
          delete convTyping[userId];
          if (Object.keys(convTyping).length === 0) {
            typingTimers.delete(conversationId);
          }
        }

        // Broadcast typing:stop to the conversation room
        io.to(`conv:${conversationId}`).emit('typing:update', {
          conversationId,
          userId,
          isTyping: false
        });

        callback?.({ success: true });
      } catch (err) {
        logger.error({ err, userId, conversationId }, 'Error in typing:stop');
        callback?.({ error: 'INTERNAL_ERROR', message: 'Failed to process typing event.' });
      }
    });

    // ── message:send ───────────────────────────────────────────────
    socket.on('message:send', async ({ conversationId, content }, callback) => {
      try {
        if (!conversationId || !content) {
          return callback?.({ error: 'INVALID_INPUT', message: 'conversationId and content are required.' });
        }

        if (typeof content !== 'string' || content.trim().length === 0) {
          return callback?.({ error: 'INVALID_INPUT', message: 'Message content cannot be empty.' });
        }

        if (content.length > 5000) {
          return callback?.({ error: 'MESSAGE_TOO_LONG', message: 'Message exceeds 5000 character limit.' });
        }

        // Verify user is a participant
        const isParticipant = await conversationService.isParticipant(conversationId, userId);
        if (!isParticipant) {
          return callback?.({ error: 'NOT_AUTHORIZED', message: 'You are not a participant in this conversation.' });
        }

        const message = await conversationService.sendMessage({
          conversationId,
          senderId: userId,
          content: content.trim()
        });

        // Broadcast to all participants in the room (including sender for optimistic UI)
        io.to(`conv:${conversationId}`).emit('message:new', message);

        // Compute and emit unread count to the other participant(s)
        try {
          const participants = await conversationService.getConversationParticipants(conversationId);
          for (const p of participants) {
            if (p.userId !== userId) {
              const unreadCount = await conversationService.computeUnreadCount(conversationId, p.userId);
              io.to(`user:${p.userId}`).emit('unread', { conversationId, count: unreadCount });
            }
          }
        } catch (unreadErr) {
          logger.warn({ err: unreadErr, conversationId }, 'Failed to emit unread counts');
        }

        callback?.({ success: true, data: message });
      } catch (err) {
        logger.error({ err, userId, conversationId }, 'Error sending message');
        callback?.({ error: 'INTERNAL_ERROR', message: 'Failed to send message.' });
      }
    });

    // ── disconnect ─────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, userId, reason }, 'Socket disconnected');

      // Clean up typing timers for this user and broadcast typing:stop
      for (const [convId, typingData] of typingTimers.entries()) {
        if (typingData[userId]) {
          clearTimeout(typingData[userId]);
          delete typingData[userId];
          if (Object.keys(typingData).length === 0) {
            typingTimers.delete(convId);
          }
          // Notify other participants — they should no longer see a stale indicator
          io.to(`conv:${convId}`).emit('typing:update', {
            conversationId: convId,
            userId,
            isTyping: false
          });
        }
      }

      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // User has no more active connections — broadcast offline
          broadcastPresence(io, userId, false).catch((err) => {
            logger.error({ err, userId }, 'Failed to broadcast presence:offline');
          });
        }
      }
    });
  });
};

/**
 * Broadcast presence:update to all users that share a conversation with the given userId.
 * Queries the database to find conversation partners so presence is only shared
 * with authorized users (those sharing a conversation).
 */
async function broadcastPresence(io, userId, isOnline) {
  // Find all conversation participant IDs that share a conversation with this user
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId },
    select: {
      conversation: {
        select: {
          participants: {
            select: { userId: true }
          }
        }
      }
    }
  });

  // Collect unique other user IDs to notify
  const notified = new Set();
  for (const p of participants) {
    for (const other of p.conversation.participants) {
      if (other.userId !== userId && !notified.has(other.userId)) {
        notified.add(other.userId);
        io.to(`user:${other.userId}`).emit('presence:update', { userId, isOnline });
      }
    }
  }
}

/**
 * Check if a user has any active socket connections.
 */
export const isUserOnline = (userId) => {
  return userSockets.has(userId) && userSockets.get(userId).size > 0;
};
