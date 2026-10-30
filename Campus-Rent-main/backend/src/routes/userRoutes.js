import express from 'express';
import * as userController from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/users/me - Authenticated user's own profile
router.get('/me', requireAuth, userController.getMyProfile);

// GET /api/users/:id - Public user profile
router.get('/:id', userController.getPublicProfile);

export default router;
