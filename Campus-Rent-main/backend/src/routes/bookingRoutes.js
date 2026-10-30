import express from 'express';
import * as bookingController from '../controllers/bookingController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/my-bookings', requireAuth, bookingController.getMyBookings);
router.post('/', requireAuth, bookingController.createBooking);
router.patch('/:bookingId/status', requireAuth, bookingController.updateBookingStatus);

export default router;
