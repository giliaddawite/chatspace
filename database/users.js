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
  
      if (username.length < 3 || username.length > 50) {
        throw new Error('Username must be between 3 and 50 characters');
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

/** 
 * Store a refresh token in the database
 * Called after login or register when issuing a new token pair.
 * 
 * @param {number} userId - The user this token belongs to
 * @param {string} jti - Unique token ID (from crypto.randomBytes)
 * @param {string} token - The full JWT refresh token string
 * @param {string|null} expiresAt - ISO timestamp of when it expires
 * @returns {Promise<Object>} The stored token record
 */

async function storeRefreshToken(userId, jti, token, expiresAt) {
    try {
        if (!userId || !jti || !token) {
            throw new Error('userId, jti, and token are required');
        }
        
        const result = await pool.query(
            'INSERT INTO refresh_tokens (user_id, jti, token, expires_at) VALUES ($1, $2, $3, $4) RETURNING user_id, jti, expires_at, revoked, created_at',
            [userId, jti, token, expiresAt]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error storing refresh token:', error);
        throw error;
    }
}

/**
 * Look up a refresh token by its unique ID (jti)
 * Called during token refresh to check if the token is still valid.
 * This is Gate #3 in the refresh flow.
 * 
 * @param {string} jti - The token's unique ID
 * @returns {Promise<Object|null>} Token record or null if not found
 */

async function getRefreshToken(jti) {
    try {
        if (!jti) {
            throw new Error('jti is required');
        }

        const result = await pool.query(
            'SELECT user_id, jti, expires_at, revoked FROM refresh_tokens WHERE jti = $1',
            [jti]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    } catch (error) {
        console.error('Error getting refresh token:', error);
        throw error;
    }
}

/**
 * Revoke a single refresh token (token rotation)
 * Called after a refresh token is used — we mark it as revoked
 * so it can never be used again. This is token rotation.
 * 
 * @param {string} jti - The token's unique ID
 * @returns {Promise<boolean>} true if revoked, false if token not found
 */

async function revokeRefreshToken(jti) {
    try {
        if (!jti) {
            throw new Error('jti is required');
        }
    
        const result = await pool.query(
            'UPDATE refresh_tokens SET revoked = true WHERE jti = $1 RETURNING jti',
            [jti]
        );
        return result.rows.length > 0;
    } catch (error) {
        console.error('Error revoking refresh token:', error.message);
        throw error;
    }
}

/**
 * Revoke ALL refresh tokens for a user (logout from all devices)
 * Called when a user hits the logout endpoint.
 * Every session they have — phone, laptop, tablet — gets killed.
 * 
 * @param {number} userId - The user whose tokens should be revoked
 * @returns {Promise<number>} Number of tokens revoked
 */

async function revokeAllUserRefreshTokens(userId) {
    try {
        if (!userId) {
            throw new Error('userId is required');
        }
        const result = await pool.query(
            'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND revoked = false RETURNING jti',
            [userId]
        );
        console.log(`Revoked ${result.rowCount} refresh tokens for user ${userId}`);
        return result.rowCount;

    } catch (error) {
        console.error('Error revoking all refresh tokens for user:', error.message);
        throw error;
    }
}

module.exports = {
    createUser,
    getUserById,
    getUserByUsername,
    getAllUsers,
    getUserByEmail,
    storeRefreshToken,
    getRefreshToken,
    revokeRefreshToken,
    revokeAllUserRefreshTokens,
};