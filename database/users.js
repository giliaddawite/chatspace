/**
 * User Database Operations
 * 
 * This file contains all database operations related to users.
 * Functions follow the pattern:
 * 1. Validate input
 * 2. Execute SQL query
 * 3. Return result or handle error
 */

const pool = require('./connection');

/**
 * Create a new user
 * @param {Object} userData - User data to create
 * @param {string} userData.username - Unique username
 * @param {string} userData.email - Unique email
 * @param {string} userData.password - Password (will be hashed)
 * @returns {Promise<Object>} Created user data or error
 */

async function createUser(username, email, passwordHash) {
    try {
      // Input validation
      if (!username || !email || !passwordHash) {
        throw new Error('Username, email, and password are required');
      }
  
      if (username.length < 3 || username.length > 20) {
        throw new Error('Username must be between 3 and 20 characters');
      }
      
      // Check if username already exists
      const usernameCheck = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (usernameCheck.rows.length > 0) {
        throw new Error('Username already taken');
      }

      // Check if email already exists
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (emailCheck.rows.length > 0) {
        throw new Error('Email already registered');

      }

      // Insert user into database
      const result = await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
        [username, email, passwordHash]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
}

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User data or null if not found
 */
async function getUserById(userId) {
    try {
        if (!userId || typeof userId !== 'number') {
            throw new Error('Invalid user ID');
        }

        const result = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];

    } catch (error) {
        console.error('Error getting user by ID:', error.message);
        throw error;
    }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User data or null if not found
 */
async function getUserByEmail(email) {
    try {
      if (!email) {
        throw new Error('Email is required');
      }
  
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
  
      if (result.rows.length === 0) {
        return null;
      }
  
      return result.rows[0];
  
    } catch (error) {
      console.error('Error getting user by email:', error.message);
      throw error;
    }
}

/**
 * Get user by username
 * @param {string} username - Username
 * @returns {Promise<Object|null>} User data or null if not found
 */
async function getUserByUsername(username) {
    try {
        if (!username || typeof username !== 'string') {
            throw new Error('Invalid username');
        }
        
        const result = await pool.query(
            'SELECT id, username, email, created_at FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];

    } catch (error) {
        console.error('Error getting user by username:', error.message);
        throw error;
    }
}

/**
 * Get all users
 * @returns {Promise<Array>} Array of all users
 */
async function getAllUsers() {
    try {
        const result = await pool.query(
            'SELECT id, username, email, created_at FROM users ORDER BY created_at DESC'
        );

        return result.rows;

    } catch (error) {
        console.error('Error getting all users:', error.message);
        throw error;
    }
}   

module.exports = {
    createUser,
    getUserById,
    getUserByUsername,
    getAllUsers,
    getUserByEmail,
};

