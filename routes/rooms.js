const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateRoomCreation } = require('../middleware/validation');
const {
  createRoom,
  getAllRooms,
  getRoombyID,
  getRoombyName,
} = require('../database/rooms');

// POST /api/v1/rooms
router.post('/', authenticate, validateRoomCreation, async (req, res, next) => {
  try {
    const { name, description } = req.validatedData;
    const userId = Number(req.user.id);

    const existingRoom = await getRoombyName(name);
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ROOM_NAME_EXISTS',
          message: 'A room with this name already exists',
          field: 'name',
        },
      });
    }

    const room = await createRoom(name, description || '', userId);
    res.status(201).json({
      success: true,
      data: {
        room,
      },
    });
  } catch (error) {
    if (error.message.includes('Room name already exists')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ROOM_NAME_EXISTS',
          message: error.message,
          field: 'name',
        },
      });
    }
    next(error);
  }
});

// GET /api/v1/rooms
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const search = req.query.search;
    const order = req.query.order === 'asc' ? 'asc' : 'desc';

    const rooms = await getAllRooms();

    let filteredRooms = rooms;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRooms = filteredRooms.filter((room) =>
        room.name.toLowerCase().includes(searchLower)
      );
    }

    // Sort by created_at descending by default
    filteredRooms.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return order === 'asc' ? aTime - bTime : bTime - aTime;
    });

    const totalItems = filteredRooms.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const startIndex = (page - 1) * limit;
    const roomPage = filteredRooms.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      data: {
        rooms: roomPage,
        pagination: {
          current_page: page,
          per_page: limit,
          total_items: totalItems,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_previous: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/rooms/:roomId
router.get('/:roomId', async (req, res, next) => {
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

    res.json({
      success: true,
      data: {
        room,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

