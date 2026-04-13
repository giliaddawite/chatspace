const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const router = express.Router();
const {
  createUser,
  getUserByEmail,
  getUserById,
  storeRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} = require('../database/users');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-for-dev';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'super-refresh-secret-for-dev';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

async function createTokenPair(user) {
  const accessJti = crypto.randomBytes(16).toString('hex');
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, email: user.email, type: 'access', jti: accessJti },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  const refreshJti = crypto.randomBytes(16).toString('hex');
  const refreshToken = jwt.sign(
    { id: user.id, jti: refreshJti, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );

  const refreshPayload = jwt.decode(refreshToken);
  const expiresAt = refreshPayload ? new Date(refreshPayload.exp * 1000).toISOString() : null;
  await storeRefreshToken(user.id, refreshJti, refreshToken, expiresAt);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
  };
}

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header is required',
      },
    });
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header must be in the format: Bearer <token>',
      },
    });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'access') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token type',
        },
      });
    }

    const user = await getUserById(payload.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token user',
        },
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    });
  }
}

function validateRegisterInput(email, username, password) {
  const errors = [];
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    errors.push({ field: 'email', message: 'Valid email is required' });
  }
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  }
  return errors;
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const errors = validateRegisterInput(email, username, password);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errors[0].message,
          field: errors[0].field,
        },
      });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email is already registered',
          field: 'email',
        },
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await createUser(username.trim(), email, password_hash);
    const tokens = await createTokenPair(user);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const tokens = await createTokenPair(user);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'refresh_token is required',
      },
    });
  }

  let payload;
  try {
    payload = jwt.verify(refresh_token, REFRESH_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired',
      },
    });
  }

  if (payload.type !== 'refresh' || !payload.jti || !payload.id) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid',
      },
    });
  }

  const stored = await getRefreshToken(payload.jti);
  if (!stored || stored.revoked || stored.user_id !== payload.id) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'REFRESH_TOKEN_REVOKED',
        message: 'Refresh token has been revoked.',
      },
    });
  }

  // Revoke the old refresh token and issue a new pair.
  await revokeRefreshToken(payload.jti);

  const user = await getUserById(payload.id);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'User for refresh token not found',
      },
    });
  }

  const tokens = await createTokenPair(user);
  res.json({
    success: true,
    data: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    },
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  const userId = req.user.id;
  await revokeAllUserRefreshTokens(userId);
  res.json({
    success: true,
    data: {
      message: 'Logged out and refresh tokens revoked',
    },
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});

router.authenticate = authenticate;
module.exports = router;

