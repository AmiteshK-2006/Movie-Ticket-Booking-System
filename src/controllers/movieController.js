const MovieService = require('../services/movieService');

class MovieController {
  /**
   * Get all movies
   */
  static async getAllMovies(req, res) {
    try {
      const movies = await MovieService.getAllMovies();

      return res.status(200).json({
        success: true,
        count: movies.length,
        movies,
      });

    } catch (error) {
      console.error('Get movies error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get movie by ID
   */
  static async getMovieById(req, res) {
    try {
      const { id } = req.params;

      const movie = await MovieService.getMovieById(parseInt(id));

      if (!movie) {
        return res.status(404).json({
          success: false,
          error: 'Movie not found',
        });
      }

      return res.status(200).json({
        success: true,
        movie,
      });

    } catch (error) {
      console.error('Get movie error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Create new movie
   */
  static async createMovie(req, res) {
    try {
      const { title, duration_minutes } = req.body;

      if (!title || !duration_minutes) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, duration_minutes',
        });
      }

      const movie = await MovieService.createMovie(title, duration_minutes);

      return res.status(201).json({
        success: true,
        movie,
      });

    } catch (error) {
      console.error('Create movie error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get shows for a movie
   */
  static async getMovieShows(req, res) {
    try {
      const { id } = req.params;

      const shows = await MovieService.getMovieShows(parseInt(id));

      return res.status(200).json({
        success: true,
        count: shows.length,
        shows,
      });

    } catch (error) {
      console.error('Get movie shows error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

module.exports = MovieController;
