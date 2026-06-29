const ShowService = require('../services/showService');

class ShowController {
  /**
   * Get all shows
   */
  static async getAllShows(req, res) {
    try {
      const { movie_id, date } = req.query;

      const shows = await ShowService.getAllShows({
        movieId: movie_id,
        date,
      });

      return res.status(200).json({
        success: true,
        count: shows.length,
        shows,
      });

    } catch (error) {
      console.error('Get shows error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get show by ID
   */
  static async getShowById(req, res) {
    try {
      const { id } = req.params;

      const show = await ShowService.getShowById(parseInt(id));

      if (!show) {
        return res.status(404).json({
          success: false,
          error: 'Show not found',
        });
      }

      return res.status(200).json({
        success: true,
        show,
      });

    } catch (error) {
      console.error('Get show error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Create new show
   */
  static async createShow(req, res) {
    try {
      const { movie_id, start_time, end_time } = req.body;

      if (!movie_id || !start_time || !end_time) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: movie_id, start_time, end_time',
        });
      }

      const show = await ShowService.createShow(movie_id, start_time, end_time);

      return res.status(201).json({
        success: true,
        show,
      });

    } catch (error) {
      console.error('Create show error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get available seats for a show
   */
  static async getAvailableSeats(req, res) {
    try {
      const { id } = req.params;

      const seats = await ShowService.getAvailableSeats(parseInt(id));

      return res.status(200).json({
        success: true,
        count: seats.length,
        seats,
      });

    } catch (error) {
      console.error('Get available seats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get seat summary for a show
   */
  static async getSeatSummary(req, res) {
    try {
      const { id } = req.params;

      const summary = await ShowService.getSeatSummary(parseInt(id));

      return res.status(200).json({
        success: true,
        summary,
      });

    } catch (error) {
      console.error('Get seat summary error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

module.exports = ShowController;
