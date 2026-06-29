const UserService = require('../services/userService');

class UserController {
  /**
   * Create new user
   */
  static async createUser(req, res) {
    try {
      const { name, email, phone } = req.body;

      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, email, phone',
        });
      }

      // Check if user already exists
      const existingUser = await UserService.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists',
        });
      }

      const user = await UserService.createUser(name, email, phone);

      return res.status(201).json({
        success: true,
        user,
      });

    } catch (error) {
      console.error('Create user error:', error);
      
      if (error.message.includes('unique constraint')) {
        return res.status(400).json({
          success: false,
          error: 'User with this email already exists',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const user = await UserService.getUserById(parseInt(id));

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.status(200).json({
        success: true,
        user,
      });

    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get all users
   */
  static async getAllUsers(req, res) {
    try {
      const users = await UserService.getAllUsers();

      return res.status(200).json({
        success: true,
        count: users.length,
        users,
      });

    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

module.exports = UserController;
