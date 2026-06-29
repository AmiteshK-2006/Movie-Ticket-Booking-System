const express = require('express');
const BookingController = require('../controllers/bookingController');

const router = express.Router();

// Create new booking
router.post('/', BookingController.createBooking);

// Get booking details
router.get('/:id', BookingController.getBookingDetails);

// Confirm booking
router.put('/:id/confirm', BookingController.confirmBooking);

// Cancel booking
router.put('/:id/cancel', BookingController.cancelBooking);

// Get user bookings
router.get('/user/:userId', BookingController.getUserBookings);

module.exports = router;
