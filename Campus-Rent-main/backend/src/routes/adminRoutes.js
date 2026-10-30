import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import adminOnly from '../middleware/adminOnly.js';

const router = express.Router();

// All admin routes require authentication + ADMIN role
router.use(requireAuth, adminOnly);

// Dashboard
router.get('/stats', adminController.getStats);

// User management
router.get('/users', adminController.getUsers);

// Booking management
router.get('/bookings', adminController.getBookings);

// Listing moderation
router.patch('/listings/:id/hide', adminController.hideListing);
router.patch('/listings/:id/restore', adminController.restoreListing);

export default router;
