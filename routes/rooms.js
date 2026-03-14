const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validateRoomCreation } = require('../middleware/validation');
const db = require('../storage/database');

/**
 * POST /api/v1/rooms
 * Create a new chat room
 *
 * Authentication: Required
 * Request Body:
 *   - name (required): string, 3-50 characters
 *   - description (optional): string, max 200 characters
 *   - is_private (optional): boolean, default false
 *   - max_members (optional): integer, default unlimited
 *
 * Success Response: 201 Created
 * Error Responses:
 *   - 400: Validation error or room name already exists
 *   - 401: Not authenticated
 *   - 500: Server error
 */
router.post('/', authenticate, validateRoomCreation, (req, res, next) => {
  try {
    const { name, description, is_private, max_members } = req.validatedData;
    const { username } = req.user;

    // Check if room name already exists
    const existingRoom = db.getRoomByName(name);
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

    // Create room
    const room = db.createRoom({
      name,
      description,
      is_private,
      max_members,
      created_by: username,
    });

    // Return created room
    res.status(201).json({
      success: true,
      data: {
        room: room.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/rooms
 * Get list of rooms (with pagination, filtering, sorting)
 *
 * Query Parameters:
 *   - page (optional): integer, default 1
 *   - limit (optional): integer, default 20
 *   - is_private (optional): boolean
 *   - sort_by (optional): string, default 'created_at'
 *   - order (optional): 'asc' | 'desc', default 'desc'
 *   - search (optional): string, search by name
 */
router.get('/', (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const isPrivate =
      req.query.is_private !== undefined ? req.query.is_private === 'true' : undefined;
    const sortBy = req.query.sort_by || 'created_at';
    const order = req.query.order || 'desc';
    const search = req.query.search;

    // Get all rooms
    let rooms = Array.from(db.rooms.values());

    // Apply filters
    if (isPrivate !== undefined) {
      rooms = rooms.filter((room) => room.is_private === isPrivate);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      rooms = rooms.filter((room) => room.name.toLowerCase().includes(searchLower));
    }

    // Sort
    rooms.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'created_at') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    // Paginate
    const totalItems = rooms.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRooms = rooms.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        rooms: paginatedRooms.map((room) => room.toJSON()),
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_items: totalItems,
          per_page: limit,
          has_next: page < totalPages,
          has_previous: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/rooms/:roomId
 * Get a specific room by ID
 */
router.get('/:roomId', (req, res, next) => {
  try {
    const roomId = parseInt(req.params.roomId);
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

    res.json({
      success: true,
      data: {
        room: room.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

