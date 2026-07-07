const { query } = require('../config/database');

class UserService {
  /**
   * Create new user
   */
  static async createUser(name, email, phone) {
    const result = await query(
      `INSERT INTO users (name, email, phone, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, name, email, phone, created_at`,
      [name, email, phone]
    );

    return result.rows[0];
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId) {
    const result = await query(
      'SELECT id, name, email, phone, created_at FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email) {
    const result = await query(
      'SELECT id, name, email, phone, created_at FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all users
   */
  static async getAllUsers() {
    const result = await query(
      'SELECT id, name, email, phone, created_at FROM users ORDER BY created_at DESC'
    );

    return result.rows;
  }
}

module.exports = UserService;
