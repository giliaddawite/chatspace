const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getRoombyID,
  isUserInRoom,
} = require('../database/rooms');
const {
  getMessagesByRoom,
  createMessage,
} = require('../database/messages');

// GET /api/v1/rooms/:roomId/messages
router.get('/:roomId/messages', authenticate, async (req, res, next) => {
  try {
    const roomId = Number(req.params.roomId);
    if (Number.isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valid room ID is required',
          field: 'roomId',
        },
      });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before;

    const room = await getRoombyID(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'Room does not exist',
        },
      });
    }

    const userId = Number(req.user.id);
    const member = await isUserInRoom(userId, roomId);
    if (!member) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be a member of this room to view messages',
        },
      });
    }

    const result = await getMessagesByRoom(roomId, { limit, before });

    res.json({
      success: true,
      data: {
        messages: result.messages,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/rooms/:roomId/messages
router.post('/:roomId/messages', authenticate, async (req, res, next) => {
  try {
    const roomId = Number(req.params.roomId);
    if (Number.isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Valid room ID is required',
          field: 'roomId',
        },
      });
    }

    const { content } = req.body;
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

    const room = await getRoombyID(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROOM_NOT_FOUND',
          message: 'Room does not exist',
        },
      });
    }

    const userId = Number(req.user.id);
    const member = await isUserInRoom(userId, roomId);
    if (!member) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be a member of this room to send messages',
        },
      });
    }

    const message = await createMessage(roomId, userId, content.trim());

    res.status(201).json({
      success: true,
      data: {
        message,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

