const { query } = require('../config/database');

class MovieService {
  /**
   * Get all movies
   */
  static async getAllMovies() {
    const result = await query(
      `SELECT id, title, duration_minutes, created_at
       FROM movies
       ORDER BY created_at DESC`
    );

    return result.rows;
  }

  /**
   * Get movie by ID
   */
  static async getMovieById(movieId) {
    const result = await query(
      'SELECT id, title, duration_minutes, created_at FROM movies WHERE id = $1',
      [movieId]
    );

    return result.rows[0] || null;
  }

  /**
   * Create new movie
   */
  static async createMovie(title, durationMinutes) {
    const result = await query(
      `INSERT INTO movies (title, duration_minutes, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id, title, duration_minutes, created_at`,
      [title, durationMinutes]
    );

    return result.rows[0];
  }

  /**
   * Get shows for a movie
   */
  static async getMovieShows(movieId) {
    const result = await query(
      `SELECT id, start_time, end_time, created_at
       FROM shows
       WHERE movie_id = $1
       ORDER BY start_time ASC`,
      [movieId]
    );

    return result.rows;
  }
}

module.exports = MovieService;
