const { query } = require('../config/database');

class ShowService {
  /**
   * Get all shows
   */
  static async getAllShows(filters = {}) {
    let queryText = `
      SELECT 
        s.id, s.start_time, s.end_time, s.created_at,
        m.id as movie_id, m.title as movie_title, m.duration_minutes
      FROM shows s
      JOIN movies m ON s.movie_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.movieId) {
      queryText += ` AND s.movie_id = $${paramCount}`;
      params.push(filters.movieId);
      paramCount++;
    }

    if (filters.date) {
      queryText += ` AND DATE(s.start_time) = $${paramCount}`;
      params.push(filters.date);
      paramCount++;
    }

    queryText += ` ORDER BY s.start_time ASC`;

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Get show by ID
   */
  static async getShowById(showId) {
    const result = await query(
      `SELECT 
        s.id, s.start_time, s.end_time, s.created_at,
        m.id as movie_id, m.title as movie_title, 
        m.duration_minutes
       FROM shows s
       JOIN movies m ON s.movie_id = m.id
       WHERE s.id = $1`,
      [showId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create new show
   */
  static async createShow(movieId, startTime, endTime) {
    // Validate movie exists
    const movieCheck = await query(
      'SELECT id, duration_minutes FROM movies WHERE id = $1',
      [movieId]
    );

    if (movieCheck.rows.length === 0) {
      throw new Error('Movie not found');
    }

    // Insert show
    const result = await query(
      `INSERT INTO shows (movie_id, start_time, end_time, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, movie_id, start_time, end_time, created_at`,
      [movieId, startTime, endTime]
    );

    return result.rows[0];
  }

  /**
   * Get available seats for a show
   */
  static async getAvailableSeats(showId) {
    const result = await query(
      `SELECT s.id, s.row, s.seat_number
       FROM seats s
       WHERE s.id NOT IN (
         SELECT bs.seat_id 
         FROM booking_seats bs
         JOIN bookings b ON bs.booking_id = b.id
         WHERE bs.show_id = $1 
         AND b.status = 'CONFIRMED'
       )
       ORDER BY s.row, s.seat_number`,
      [showId]
    );

    return result.rows;
  }

  /**
   * Get booked seats for a show
   */
  static async getBookedSeats(showId) {
    const result = await query(
      `SELECT s.id, s.row, s.seat_number
       FROM booking_seats bs
       JOIN seats s ON bs.seat_id = s.id
       JOIN bookings b ON bs.booking_id = b.id
       WHERE bs.show_id = $1 
       AND b.status = 'CONFIRMED'
       ORDER BY s.row, s.seat_number`,
      [showId]
    );

    return result.rows;
  }

  /**
   * Get seat availability summary for a show
   */
  static async getSeatSummary(showId) {
    const result = await query(
      `SELECT 
        (SELECT COUNT(*) FROM seats) as total_seats,
        COUNT(bs.seat_id) as booked_seats,
        (SELECT COUNT(*) FROM seats) - COUNT(bs.seat_id) as available_seats
       FROM booking_seats bs
       JOIN bookings b ON bs.booking_id = b.id
       WHERE bs.show_id = $1 AND b.status = 'CONFIRMED'`,
      [showId]
    );

    return result.rows[0];
  }
}

module.exports = ShowService;
