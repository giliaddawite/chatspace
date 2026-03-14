/**
 * In-Memory Database
 * In production, replace with actual database (PostgreSQL, MongoDB, etc.)
 */

const Room = require('../models/Room');
const Message = require('../models/Message');

class Database {
  constructor() {
    // In-memory storage
    this.rooms = new Map();
    this.messages = new Map(); // room_id -> array of messages
    this.roomMembers = new Map(); // room_id -> Set of user_ids

    // Counters for IDs
    this.roomIdCounter = 1;
    this.messageIdCounter = 1;
  }

  // Room operations
  createRoom(roomData) {
    const id = this.roomIdCounter++;
    const room = new Room({
      ...roomData,
      id,
    });
    this.rooms.set(id, room);
    this.roomMembers.set(id, new Set([roomData.created_by]));
    return room;
  }

  getRoomById(id) {
    return this.rooms.get(id) || null;
  }

  getRoomByName(name) {
    for (const room of this.rooms.values()) {
      if (room.name.toLowerCase() === name.toLowerCase()) {
        return room;
      }
    }
    return null;
  }

  isUserInRoom(roomId, userId) {
    const members = this.roomMembers.get(roomId);
    return members ? members.has(userId) : false;
  }

  // Message operations
  createMessage(messageData) {
    const id = this.messageIdCounter++;
    const message = new Message({
      ...messageData,
      id,
    });

    const roomId = messageData.room_id;
    if (!this.messages.has(roomId)) {
      this.messages.set(roomId, []);
    }
    this.messages.get(roomId).push(message);

    return message;
  }

  getMessagesByRoom(roomId, options = {}) {
    const { limit = 50, before } = options;
    let messages = this.messages.get(roomId) || [];

    // Filter by timestamp if 'before' is provided
    if (before) {
      messages = messages.filter((msg) => msg.timestamp < before);
    }

    // Sort by timestamp (newest first)
    messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    const limitedMessages = messages.slice(0, limit);

    // Reverse to get chronological order (oldest first)
    limitedMessages.reverse();

    return {
      messages: limitedMessages,
      hasMore: messages.length > limit,
      oldestTimestamp: limitedMessages.length > 0 ? limitedMessages[0].timestamp : null,
    };
  }
}

// Singleton instance
const db = new Database();

module.exports = db;

