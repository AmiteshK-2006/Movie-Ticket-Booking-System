const express = require('express');
const UserController = require('../controllers/userController');

const router = express.Router();

// Get all users
router.get('/', UserController.getAllUsers);

// Create new user
router.post('/', UserController.createUser);

// Get user by ID
router.get('/:id', UserController.getUserById);

module.exports = router;
