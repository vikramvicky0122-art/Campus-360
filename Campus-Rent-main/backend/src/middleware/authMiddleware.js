import * as Sentry from '@sentry/node';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prismaClient.js';
import logger from '../utils/logger.js';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      logger.warn({ requestId: req.requestId }, 'Unauthorized access attempt: missing token');
      return res.status(401).json({
        success: false,
        message: 'Authorization token is required.',
        requestId: req.requestId
      });
    }

    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is not configured');
      return res.status(500).json({
        success: false,
        message: 'JWT configuration is missing.',
        requestId: req.requestId
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload?.sub;

    if (!userId) {
      logger.warn({ requestId: req.requestId }, 'Unauthorized access attempt: invalid token payload');
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload.',
        requestId: req.requestId
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: String(userId) },
      select: {
        id: true,
        fullName: true,
        collegeEmail: true,
        role: true,
        department: true,
        yearOfStudy: true,
        profileImage: true
      }
    });

    if (!user) {
      logger.warn({ requestId: req.requestId, userId }, 'Unauthorized access attempt: user not found');
      return res.status(401).json({
        success: false,
        message: 'Authentication failed.',
        requestId: req.requestId
      });
    }

    // Attach authenticated user to Sentry scope for error correlation
    req.user = user;
    Sentry.setUser({ id: user.id, role: user.role });
    next();
  } catch (error) {
    logger.warn({ err: error, requestId: req.requestId }, 'Unauthorized access attempt: invalid or expired token');
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      requestId: req.requestId
    });
  }
};
