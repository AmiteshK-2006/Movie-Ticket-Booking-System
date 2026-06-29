const express = require('express');
const MovieController = require('../controllers/movieController');

const router = express.Router();

// Get all movies
router.get('/', MovieController.getAllMovies);

// Create new movie
router.post('/', MovieController.createMovie);

// Get movie by ID
router.get('/:id', MovieController.getMovieById);

// Get shows for a movie
router.get('/:id/shows', MovieController.getMovieShows);

module.exports = router;
