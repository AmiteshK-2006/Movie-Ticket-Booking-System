const { getClient } = require('../config/database');
const LockService = require('./lockService');

const MAX_SEATS_PER_BOOKING = parseInt(process.env.MAX_SEATS_PER_BOOKING) || 6;

class BookingService {

  static async createBooking(userId, showId, seatIds) {
    // Validation
    if (!userId || !showId || !seatIds || seatIds.length === 0) {
      throw new Error('Invalid booking parameters');
    }

    if (seatIds.length > MAX_SEATS_PER_BOOKING) {
      throw new Error(`Maximum ${MAX_SEATS_PER_BOOKING} seats allowed per booking`);
    }

    // Remove duplicates
    const uniqueSeatIds = [...new Set(seatIds)];

    let lockedSeats = [];
    const client = await getClient();

    try {
      // PHASE 1: Acquire Redis locks for all seats
      const lockResult = await LockService.acquireMultipleSeatLocks(showId, uniqueSeatIds);

      if (!lockResult.success) {
        return {
          success: false,
          error: 'SEAT_LOCKED',
          message: `Seat ${lockResult.failedSeat} is already locked by another user`,
        };
      }

      lockedSeats = lockResult.lockedSeats;

      // PHASE 2: Start database transaction
      await client.query('BEGIN');

      // Verify seats exist and belong to the show's screen
      const seatCheck = await client.query(
        `SELECT id FROM seats WHERE id = ANY($1)`,
        [uniqueSeatIds]
      );

      if (seatCheck.rows.length !== uniqueSeatIds.length) {
        throw new Error('Invalid seat IDs');
      }

      // Check if seats are already booked (CONFIRMED status)
      const bookedCheck = await client.query(
        `SELECT bs.seat_id FROM booking_seats bs
         JOIN bookings b ON bs.booking_id = b.id
         WHERE bs.show_id = $1 
         AND bs.seat_id = ANY($2)
         AND b.status = 'CONFIRMED'`,
        [showId, uniqueSeatIds]
      );

      if (bookedCheck.rows.length > 0) {
        const bookedSeatIds = bookedCheck.rows.map(r => r.seat_id);
        throw new Error(`Seats already booked: ${bookedSeatIds.join(', ')}`);
      }

      // Create booking record
      const bookingResult = await client.query(
        `INSERT INTO bookings (user_id, show_id, total_seats, status, created_at, updated_at)
         VALUES ($1, $2, $3, 'PENDING', NOW(), NOW())
         RETURNING id, status, created_at`,
        [userId, showId, uniqueSeatIds.length]
      );

      const bookingId = bookingResult.rows[0].id;

      // Insert booking_seats records
      const bookingSeatValues = uniqueSeatIds.map(seatId => `(${bookingId}, ${showId}, ${seatId}, NOW())`).join(',');
      
      await client.query(
        `INSERT INTO booking_seats (booking_id, show_id, seat_id, created_at)
         VALUES ${bookingSeatValues}`
      );

      // Commit transaction
      await client.query('COMMIT');

      // Fetch complete booking details
      const bookingDetails = await this.getBookingDetails(bookingId);

      return {
        success: true,
        booking: bookingDetails,
        message: 'Booking created successfully. Please confirm within 30 seconds.',
      };

    } catch (error) {
      // Rollback transaction
      await client.query('ROLLBACK');

      // Release Redis locks
      if (lockedSeats.length > 0) {
        await LockService.releaseMultipleSeatLocks(showId, lockedSeats);
      }

      console.error('Booking creation error:', error);

      if (error.message.includes('unique constraint')) {
        return {
          success: false,
          error: 'SEAT_ALREADY_BOOKED',
          message: 'One or more seats are already booked',
        };
      }

      throw error;
    } finally {
      client.release();
    }
  }



  /**
   * Confirm a pending booking
   */
  static async confirmBooking(bookingId) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Check booking exists and is PENDING
      const bookingCheck = await client.query(
        'SELECT id, show_id, status FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (bookingCheck.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingCheck.rows[0];

      if (booking.status !== 'PENDING') {
        throw new Error(`Cannot confirm booking with status: ${booking.status}`);
      }

      // Update booking status
      await client.query(
        'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
        ['CONFIRMED', bookingId]
      );

      await client.query('COMMIT');

      // Release Redis locks (seats are now confirmed)
      const seatIds = await client.query(
        'SELECT seat_id FROM booking_seats WHERE booking_id = $1',
        [bookingId]
      );
      
      await LockService.releaseMultipleSeatLocks(
        booking.show_id,
        seatIds.rows.map(r => r.seat_id)
      );

      const bookingDetails = await this.getBookingDetails(bookingId);

      return {
        success: true,
        booking: bookingDetails,
        message: 'Booking confirmed successfully',
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }



  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId) {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const bookingCheck = await client.query(
        'SELECT id, show_id, status FROM bookings WHERE id = $1',
        [bookingId]
      );

      if (bookingCheck.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingCheck.rows[0];

      if (booking.status === 'CANCELLED') {
        throw new Error('Booking already cancelled');
      }

      // Update status
      await client.query(
        'UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2',
        ['CANCELLED', bookingId]
      );

      await client.query('COMMIT');

      // Release locks if PENDING
      if (booking.status === 'PENDING') {
        const seatIds = await client.query(
          'SELECT seat_id FROM booking_seats WHERE booking_id = $1',
          [bookingId]
        );
        
        await LockService.releaseMultipleSeatLocks(
          booking.show_id,
          seatIds.rows.map(r => r.seat_id)
        );
      }

      return {
        success: true,
        message: 'Booking cancelled successfully',
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }



  /**
   * Get booking details with seats
   */
  static async getBookingDetails(bookingId) {
    const { query } = require('../config/database');

    const result = await query(
      `SELECT 
        b.id, b.user_id, b.show_id, b.total_seats, b.status,
        b.created_at, b.updated_at,
        u.name as user_name, u.email as user_email,
        m.title as movie_title,
        sh.start_time, sh.end_time,
        json_agg(json_build_object(
          'seat_id', s.id,
          'row', s.row,
          'seat_number', s.seat_number
        )) as seats
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN shows sh ON b.show_id = sh.id
       JOIN movies m ON sh.movie_id = m.id
       JOIN booking_seats bs ON b.id = bs.booking_id
       JOIN seats s ON bs.seat_id = s.id
       WHERE b.id = $1
       GROUP BY b.id, u.name, u.email, m.title, sh.start_time, sh.end_time`,
      [bookingId]
    );

    return result.rows[0] || null;
  }



  /**
   * Get user booking history
   */
  static async getUserBookings(userId) {
    const { query } = require('../config/database');

    const result = await query(
      `SELECT 
        b.id, b.show_id, b.total_seats, b.status,
        b.created_at, b.updated_at,
        m.title as movie_title,
        sh.start_time, sh.end_time
       FROM bookings b
       JOIN shows sh ON b.show_id = sh.id
       JOIN movies m ON sh.movie_id = m.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [userId]
    );

    return result.rows;
  }


  
  /**
   * Cleanup expired bookings (run periodically)
   */
  static async cleanupExpiredBookings() {
    const { query } = require('../config/database');

    const result = await query(
      `DELETE FROM bookings 
      WHERE status = 'PENDING' 
      AND created_at < NOW() - INTERVAL '30 seconds'
      RETURNING id`
    );
    // ON DELETE CASCADE => automatically deletes booking_seats records

    return {
      expiredCount: result.rowCount,
      bookingIds: result.rows.map(r => r.id),
    };
  }
}

module.exports = BookingService;
