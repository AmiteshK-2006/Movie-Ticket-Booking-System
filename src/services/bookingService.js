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
        `SELECT s.id FROM seats s
         JOIN shows sh ON true
         WHERE s.id = ANY($1) AND sh.id = $2`,
        [uniqueSeatIds, showId]
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
}

module.exports = BookingService;
