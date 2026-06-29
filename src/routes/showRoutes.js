const express = require('express');
const ShowController = require('../controllers/showController');

const router = express.Router();

// Get all shows (with optional filters)
router.get('/', ShowController.getAllShows);

// Create new show
router.post('/', ShowController.createShow);

// Get show by ID
router.get('/:id', ShowController.getShowById);

// Get available seats for a show
router.get('/:id/seats/available', ShowController.getAvailableSeats);

// Get seat summary for a show
router.get('/:id/seats/summary', ShowController.getSeatSummary);

module.exports = router;
