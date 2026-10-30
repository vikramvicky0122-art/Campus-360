import * as conversationService from '../services/conversationService.js';

export const getMyConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversations = await conversationService.getMyConversations(userId);

    res.status(200).json({
      success: true,
      data: conversations
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in getMyConversations controller');
    next(error);
  }
};

export const getConversationMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const cursor = req.query.cursor;
    const limit = parseInt(req.query.limit, 10) || 50;

    const result = await conversationService.getConversationMessages(
      conversationId,
      userId,
      cursor,
      Math.min(limit, 100)
    );

    res.status(200).json({
      success: true,
      data: result.messages,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in getConversationMessages controller');
    next(error);
  }
};

export const markConversationRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    await conversationService.markConversationRead(conversationId, userId);

    // Emit unread update to the user so other tabs/clients sync
    const unreadCount = await conversationService.computeUnreadCount(conversationId, userId);
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${userId}`).emit('unread', { conversationId, count: unreadCount });
    }

    res.status(200).json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in markConversationRead controller');
    next(error);
  }
};
