// Rooms Database Operations

const pool = require('./connection');

// Create a chat new room
async function createRoom(name, description = '', createdBy) {
    try {

        if (!name || typeof name !== 'string') {
            throw new Error('Room name is required');
        }
        
        if (name.length < 3 || name.length > 50) {
            throw new Error('Room name must be between 3 and 50 characters');
        }

        if (!createdBy || typeof createdBy !== 'number') {
            throw new Error('Created user ID is required');
        }

        const userCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [createdBy]
        );

        if (userCheck.rows.length === 0) {
            throw new Error('User not found');
        }

        const roomCheck = await pool.query(
            'SELECT id from rooms WHERE name = $1',
            [name]
        );
        
        if (roomCheck.rows.length > 0) {
            throw new Error('Room name already exists');
        }

        const roomInsert = await pool.query(
            'INSERT INTO rooms (name, description, created_by) VALUES ($1, $2, $3) RETURNING id, name, description, created_by',
            [name, description, createdBy]
        );

        const newRoom = roomInsert.rows[0];

        await pool.query(
            'INSERT INTO room_members (user_id, room_id, joined_at) VALUES ($1, $2, NOW())',
            [createdBy, newRoom.id]
        );

        return newRoom;
    } catch (error) {
        console.error('Error creating room:', error);
        throw error;
    }
}

// Get all rooms 
async function getAllRooms() {
    try {
        const result = await pool.query(
            'SELECT r.id, r.name, r.description, r.created_by, COUNT(rm.user_id) AS member_count FROM rooms r LEFT JOIN room_members rm ON r.id = rm.room_id GROUP BY r.id ORDER BY r.created_at DESC'
        );

        const rooms = result.rows.map(room => ({...room, member_count: parseInt(room.member_count)}));
        return rooms;

    } catch (error) {
        console.error('Error getting all rooms:', error);
        throw error;
    }
}

// Get a room by ID with member count
async function getRoombyID(roomID) {
    try {
        if (!roomID || typeof roomID !== 'number') {
            throw new Error('Valid room ID is required');
        }
    
        const result = await pool.query(
            'SELECT r.id, r.name, r.description, r.created_by, r.created_at, COUNT(rm.user_id) as member_count FROM rooms r LEFT JOIN room_members rm ON r.id = rm.room_id WHERE r.id = $1 GROUP BY r.id',
            [roomID]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const room = result.rows[0];
        room.member_count = parseInt(room.member_count);

        return room;

    } catch (error) {
        console.error('Error getting room by ID:', error);
        throw error;
    }
}


// Get a room by name
async function getRoombyName(roomName) {
    try {
        if (!roomName) {
            throw new Error('Room name is required');
        }
        
        const result = await pool.query(
            'SELECT * FROM rooms WHERE name = $1',
            [roomName]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];

    } catch (error) {
        console.error('Error getting room by name:', error);
        throw error;
    }
}
// Join a room
async function joinRoom(userId, roomId) {
    try {
      // Validate inputs
      if (!userId || typeof userId !== 'number') {
        throw new Error('Valid user ID is required');
      }
  
      if (!roomId || typeof roomId !== 'number') {
        throw new Error('Valid room ID is required');
      }

      const userCheck = await pool.query(
        'SELECT id FROM users WHERE id = $1',
        [userId]
      );

      // Check if user exists
      if (userCheck.rows.length === 0) {
        throw new Error('User not found');
      }

      // Check if room exists
      const roomCheck = await pool.query(
        'SELECT id FROM rooms WHERE id = $1',
        [roomId]
      );

      if (roomCheck.rows.length === 0) {
        throw new Error('Room not found');
      }
      // Check if already a member
      const memberCheck = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, roomId]
      );

      if (memberCheck.rows.length > 0) {
        console.log(`User ${userId} already in room ${roomId}`);
        return {
            success: true,
            message: 'Already a member of this room'
        };
      }

      //Add to room
      await pool.query(
        'INSERT INTO room_members (user_id, room_id, joined_at) VALUES ($1, $2, NOW())',
        [userId, roomId]
      );

      console.log(`User ${userId} joined room ${roomId}`);
      return {
        success: true,
        message: 'Successfully joined room'
      };

    } catch (error) {
        console.error('Error joining room:', error);
        throw error;
    }
}

//  Remove user from a room
async function leaveRoom(userId, roomId) {
    try {
      if (!userId || typeof userId !== 'number') {
        throw new Error('Valid user ID is required');
      }
  
      if (!roomId || typeof roomId !== 'number') {
        throw new Error('Valid room ID is required');
      }
  
      // Remove from room
      const result = await pool.query(
        `DELETE FROM room_members
         WHERE user_id = $1 AND room_id = $2
         RETURNING *`,
        [userId, roomId]
      );
  
      if (result.rows.length === 0) {
        console.log(`User ${userId} was not in room ${roomId}`);
        return {
          success: true,
          message: 'User was not in room'
        };
      }
  
      console.log(`User ${userId} left room ${roomId}`);
      return {
        success: true,
        message: 'Successfully left room'
      };
  
    } catch (error) {
      console.error('Error leaving room:', error.message);
      throw error;
    }
  }
  
  // Check if user is a member of a room
  async function isUserInRoom(userId, roomId) {
    try {
      if (!userId || !roomId) {
        return false;
      }
  
      const result = await pool.query(
        'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
        [userId, roomId]
      );
  
      return result.rows.length > 0;
  
    } catch (error) {
      console.error('Error checking room membership:', error.message);
      return false;
    }
  }
  
  // Get all members of a room
  async function getRoomMembers(roomId) {
    try {
      if (!roomId || typeof roomId !== 'number') {
        throw new Error('Valid room ID is required');
      }
  
      const result = await pool.query(
        `SELECT u.id, u.username, u.email, rm.joined_at
         FROM users u
         JOIN room_members rm ON u.id = rm.user_id
         WHERE rm.room_id = $1
         ORDER BY rm.joined_at ASC`,
        [roomId]
      );
  
      return result.rows;
  
    } catch (error) {
      console.error('Error getting room members:', error.message);
      throw error;
    }
  }
  
// Export all functions
module.exports = {
    createRoom,
    getAllRooms,
    getRoombyID,
    getRoombyName,
    joinRoom,
    leaveRoom,
    isUserInRoom,
    getRoomMembers
};
