import express from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/authController.js';
import logger from '../utils/logger.js';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(
      { requestId: req.requestId, ip: req.ip, url: req.url },
      'Rate limit exceeded'
    );
    res.status(options.statusCode).json(options.message);
  }
});

router.post('/signup', authLimiter, authController.signup);
router.post('/login', authLimiter, authController.login);

export default router;
