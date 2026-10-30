import prisma from '../utils/prismaClient.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class ConversationError extends AppError {
  constructor(message, statusCode) {
    super(message, statusCode);
    this.name = 'ConversationError';
  }
}

export const createConversationForBooking = async (bookingId, ownerId, borrowerId, tx) => {
  const client = tx || prisma;

  const existing = await client.conversation.findUnique({
    where: { bookingId }
  });
  if (existing) {
    return existing;
  }

  const conversation = await client.conversation.create({
    data: {
      bookingId,
      participants: {
        create: [
          { userId: ownerId },
          { userId: borrowerId }
        ]
      }
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              collegeEmail: true,
              profileImage: true,
              department: true
            }
          }
        }
      },
      booking: {
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              images: { orderBy: { displayOrder: 'asc' }, take: 1 }
            }
          }
        }
      }
    }
  });

  logger.info({ bookingId, conversationId: conversation.id }, 'Conversation auto-created on booking approval');
  return conversation;
};

/**
 * Compute the number of unread messages for a user in a conversation.
 * Counts messages created after lastReadAt that were sent by OTHER users.
 */
export const computeUnreadCount = async (conversationId, userId) => {
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId },
    select: { lastReadAt: true }
  });

  if (!participant) {
    return 0;
  }

  const where = {
    conversationId,
    senderId: { not: userId }
  };

  if (participant.lastReadAt) {
    where.createdAt = { gt: participant.lastReadAt };
  }

  return prisma.message.count({ where });
};

/**
 * Mark a conversation as read by updating the user's lastReadAt timestamp.
 */
export const markConversationRead = async (conversationId, userId) => {
  const participant = await prisma.conversationParticipant.findFirst({
    where: { conversationId, userId }
  });

  if (!participant) {
    throw new ConversationError('You are not a participant in this conversation.', 403);
  }

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() }
  });

  return { success: true };
};

export const getMyConversations = async (userId) => {
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  collegeEmail: true,
                  profileImage: true,
                  department: true
                }
              }
            }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              senderId: true,
              createdAt: true,
              sender: {
                select: {
                  id: true,
                  fullName: true
                }
              }
            }
          },
          booking: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              listing: {
                select: {
                  id: true,
                  title: true,
                  images: { orderBy: { displayOrder: 'asc' }, take: 1 }
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      conversation: {
        lastMessageAt: { sort: 'desc', nulls: 'last' }
      }
    }
  });

  // Resolve unread counts via dedicated query (more accurate than filtering last message)
  const unreadCountPromises = participants
    .filter((p) => p.conversation)
    .map((p) =>
      computeUnreadCount(p.conversationId, userId).then((count) => ({
        conversationId: p.conversationId,
        count
      }))
    );
  const unreadCounts = await Promise.all(unreadCountPromises);
  const unreadMap = {};
  unreadCounts.forEach(({ conversationId, count }) => {
    unreadMap[conversationId] = count;
  });

  return participants
    .map((p) => p.conversation)
    .filter(Boolean)
    .map((conv) => {
      const otherParticipant = conv.participants.find((p) => p.userId !== userId);
      return {
        id: conv.id,
        bookingId: conv.bookingId,
        booking: conv.booking,
        lastMessage: conv.messages[0] || null,
        otherUser: otherParticipant ? otherParticipant.user : null,
        unreadCount: unreadMap[conv.id] || 0,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      };
    });
};

export const getConversationMessages = async (conversationId, userId, cursor, limit = 50) => {
  const isParticipant = await participantCheck(conversationId, userId);
  if (!isParticipant) {
    throw new ConversationError('You are not a participant in this conversation.', 403);
  }

  const where = { conversationId };
  if (cursor) {
    where.createdAt = { lt: new Date(cursor) };
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          profileImage: true
        }
      }
    }
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return {
    messages: messages.reverse(),
    nextCursor: hasMore ? messages[0]?.createdAt.toISOString() : null,
    hasMore
  };
};

export const sendMessage = async ({ conversationId, senderId, content }) => {
  const message = await prisma.$transaction(async (tx) => {
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() }
    });

    return tx.message.create({
      data: {
        conversationId,
        senderId,
        content
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profileImage: true
          }
        }
      }
    });
  });

  return message;
};

/**
 * Get all participants of a conversation.
 */
export const getConversationParticipants = async (conversationId) => {
  return prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true, lastReadAt: true }
  });
};

export const isParticipant = async (conversationId, userId) => {
  return participantCheck(conversationId, userId);
};

const participantCheck = async (conversationId, userId) => {
  const count = await prisma.conversationParticipant.count({
    where: {
      conversationId,
      userId
    }
  });
  return count > 0;
};

export default {
  createConversationForBooking,
  getMyConversations,
  getConversationMessages,
  sendMessage,
  isParticipant,
  computeUnreadCount,
  markConversationRead,
  getConversationParticipants
};
