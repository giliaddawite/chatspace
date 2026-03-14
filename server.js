/**
 * Main Express Server
 * Entry point for the chat application backend
 *
 * This server provides REST API endpoints for:
 * - User authentication (register, login)
 * - Room management (create, list, join, leave)
 * - Message operations (send, retrieve, edit, delete)
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
// CORS: allow requests from the frontend origin
app.use(
  cors({
    origin:
      NODE_ENV === 'production'
        ? 'https://your-frontend-domain.com'
        : 'http://localhost:3001',
    credentials: true,
  })
);

// Parse JSON request bodies
app.use(express.json());
// Parse URL-encoded bodies (for form submission)
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Routes
const roomsRoutes = require('./routes/rooms');
const messagesRoutes = require('./routes/messages');
const authRoutes = require('./middleware/auth');

app.use('/api/v1/rooms', roomsRoutes);
app.use('/api/v1/rooms', messagesRoutes);
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
      availableEndpoints: '/api',
    },
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Something went wrong. Please try again later',
    },
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('   ====================================');
  console.log(`   Chat API Server Started`);
  console.log('   ====================================');
  console.log(`   Environment: ${NODE_ENV}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   URL: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API Info: http://localhost:${PORT}/api`);
  console.log('   ====================================');
  console.log('');
});

// Handle server errors
app.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES':
      console.error(`Port ${PORT} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`Port ${PORT} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

