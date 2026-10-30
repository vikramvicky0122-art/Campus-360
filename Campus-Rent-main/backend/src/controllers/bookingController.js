import * as bookingService from '../services/bookingService.js';
import * as conversationService from '../services/conversationService.js';
import { createBookingSchema, validate } from '../utils/validation.js';
import logger from '../utils/logger.js';

export const getMyBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const data = await bookingService.getMyBookings(userId);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in getMyBookings controller');
    next(error);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const validation = validate(createBookingSchema, req.body || {});
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed.',
        errors: validation.errors,
        requestId: req.requestId
      });
    }

    const borrowerId = req.user.id;
    const payload = { ...validation.data, borrowerId };

    const booking = await bookingService.createBooking(payload);

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in createBooking controller');
    next(error);
  }
};

export const updateBookingStatus = async (req, res, next) => {
  try {
    const actorId = req.user.id;
    const { bookingId } = req.params;
    const { status } = req.body || {};

    const booking = await bookingService.updateBookingStatus({
      bookingId,
      actorId,
      status
    });

    // If booking was approved, emit socket event for new conversation
    const targetStatus = String(status).toLowerCase();
    if (targetStatus === 'approved') {
      try {
        const io = req.app.get('io');
        if (io) {
          // Fetch the full conversation to include booking/listing details
          const conversations = await conversationService.getMyConversations(booking.ownerId);
          const conv = conversations.find((c) => c.bookingId === bookingId);
          if (conv) {
            io.to(`user:${booking.ownerId}`).emit('conversation:new', conv);
            io.to(`user:${booking.borrowerId}`).emit('conversation:new', conv);
          }
        }
      } catch (emitErr) {
        logger.warn({ err: emitErr, bookingId }, 'Failed to emit conversation:new socket event');
      }
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Error in updateBookingStatus controller');
    next(error);
  }
};
