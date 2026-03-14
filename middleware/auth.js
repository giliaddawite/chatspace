const express = require('express');
const router = express.Router();

/**
 * Development/demo authentication middleware.
 *
 * - If an Authorization header exists, we accept it (no JWT validation here).
 * - If it doesn't exist, we still allow the request and attach a mock user.
 *
 * This keeps the API usable during local dev while the real auth layer is built.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const usernameHeader = req.headers['x-username'];

  req.user = {
    id: '123',
    username: typeof usernameHeader === 'string' && usernameHeader.trim()
      ? usernameHeader.trim()
      : 'dev_user',
    token: typeof authHeader === 'string' ? authHeader : null,
  };

  next();
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, username } = req.body;

  // Logic: 1. Validate input, 2. Hash password, 3. Save to DB
  console.log(`Registering user: ${username}`);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    user: { id: '123', email, username },
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Logic: 1. Find user, 2. Check password, 3. Generate JWT Token
  res.json({
    success: true,
    token: 'mock-jwt-token-abc-123',
    user: { id: '123', email, username: 'dev_user' },
  });
});

// Expose middleware for routes that do: `const { authenticate } = require('../middleware/auth')`
router.authenticate = authenticate;

module.exports = router;

