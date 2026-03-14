const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../storage/database');

/**
 * GET /api/v1/rooms/:roomId/messages
 * Get messages from a specific room
 *
 * Authentication: Required
 * Query Parameters:
 *   - limit (optional): integer, default 50, max 100
 *   - before (optional): ISO timestamp, get messages before this time
 *
 * Success Response: 200 OK
 * Error Responses:
 *   - 403: User not a member of the room
 *   - 404: Room does not exist
 *   - 401: Not authenticated
 */
router.get('/:roomId/messages', authenticate, (req, res, next) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before;

    // Check if room exists
    const room = db.getRoomById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'Room does not exist',
        },
      });
    }

    // Check if user is a member (skip for public rooms in this example)
    // In production, implement proper membership checking
    const userId = req.user.id;
    if (room.is_private && !db.isUserInRoom(roomId, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be a member of this room to view messages',
        },
      });
    }

    // Get messages
    const result = db.getMessagesByRoom(roomId, { limit, before });

    res.json({
      success: true,
      data: {
        messages: result.messages.map((msg) => msg.toJSON()),
        pagination: {
          oldest_timestamp: result.oldestTimestamp,
          has_more: result.hasMore,
          returned_count: result.messages.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/rooms/:roomId/messages
 * Create a new message in a room
 *
 * Authentication: Required
 * Request Body:
 *   - content (required): string, 1-1000 characters
 */
router.post('/:roomId/messages', authenticate, (req, res, next) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const { content } = req.body;
    const user = req.user;

    // Validate room exists
    const room = db.getRoomById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'Room does not exist',
        },
      });
    }

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message content is required',
          field: 'content',
        },
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Message content must not exceed 1000 characters',
          field: 'content',
        },
      });
    }

    // Check membership (skip for public rooms)
    if (room.is_private && !db.isUserInRoom(roomId, user.id)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be a member of this room to send messages',
        },
      });
    }

    // Create message
    const message = db.createMessage({
      content: content.trim(),
      room_id: roomId,
      user: {
        id: user.id,
        username: user.username,
        avatar_url: null, // In production, get from user profile
      },
    });

    res.status(201).json({
      success: true,
      data: {
        message: message.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

