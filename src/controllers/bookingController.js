const BookingService = require('../services/bookingService');

class BookingController {
  /**
   * Create a new booking
   */
  static async createBooking(req, res) {
    try {
      const { user_id, show_id, seat_ids } = req.body;

      // Validation
      if (!user_id || !show_id || !seat_ids || !Array.isArray(seat_ids)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body. Required: user_id, show_id, seat_ids (array)',
        });
      }

      const result = await BookingService.createBooking(user_id, show_id, seat_ids);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);

    } catch (error) {
      console.error('Create booking error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
      });
    }
  }

  /**
   * Confirm a booking
   */
  static async confirmBooking(req, res) {
    try {
      const { id } = req.params;

      const result = await BookingService.confirmBooking(parseInt(id));

      return res.status(200).json(result);

    } catch (error) {
      console.error('Confirm booking error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(req, res) {
    try {
      const { id } = req.params;

      const result = await BookingService.cancelBooking(parseInt(id));

      return res.status(200).json(result);

    } catch (error) {
      console.error('Cancel booking error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get booking details
   */
  static async getBookingDetails(req, res) {
    try {
      const { id } = req.params;

      const booking = await BookingService.getBookingDetails(parseInt(id));

      if (!booking) {
        return res.status(404).json({
          success: false,
          error: 'Booking not found',
        });
      }

      return res.status(200).json({
        success: true,
        booking,
      });

    } catch (error) {
      console.error('Get booking error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get user bookings
   */
  static async getUserBookings(req, res) {
    try {
      const { userId } = req.params;

      const bookings = await BookingService.getUserBookings(parseInt(userId));

      return res.status(200).json({
        success: true,
        count: bookings.length,
        bookings,
      });

    } catch (error) {
      console.error('Get user bookings error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

module.exports = BookingController;
