import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

/**
 * Socket.IO middleware that verifies the JWT token sent as `auth.token`
 * during the handshake. Attaches `socket.userId` and `socket.userRole`
 * on success. Disconnects with a custom error on failure.
 */
export const socketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    logger.warn({ socketId: socket.id }, 'Socket connection rejected: missing token');
    return next(new Error('NOT_AUTHENTICATED'));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error('JWT_SECRET is not configured — cannot authenticate socket');
    return next(new Error('INTERNAL_ERROR'));
  }

  try {
    const payload = jwt.verify(token, secret);
    const userId = payload?.sub;

    if (!userId) {
      logger.warn({ socketId: socket.id }, 'Socket connection rejected: invalid token payload');
      return next(new Error('NOT_AUTHENTICATED'));
    }

    socket.userId = userId;
    socket.userRole = payload?.role || 'USER';
    next();
  } catch (err) {
    logger.warn({ socketId: socket.id, err }, 'Socket connection rejected: invalid or expired token');
    return next(new Error('NOT_AUTHENTICATED'));
  }
};
