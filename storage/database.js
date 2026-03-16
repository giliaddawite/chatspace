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
    this.users = new Map(); // user_id -> user
    this.usersByEmail = new Map(); // email -> user
    this.refreshTokens = new Map(); // jti -> refresh token record
    this.userRefreshTokens = new Map(); // user_id -> Set of jti

    // Counters for IDs
    this.roomIdCounter = 1;
    this.messageIdCounter = 1;
    this.userIdCounter = 1;
  }

  // User operations
  createUser(userData) {
    const id = this.userIdCounter++;
    const user = {
      id: id.toString(),
      username: userData.username,
      email: userData.email,
      password_hash: userData.password_hash,
      created_at: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email.toLowerCase(), user);
    return user;
  }

  getUserByEmail(email) {
    if (!email || typeof email !== 'string') return null;
    return this.usersByEmail.get(email.toLowerCase()) || null;
  }

  getUserById(id) {
    if (!id) return null;
    return this.users.get(id) || null;
  }

  storeRefreshToken(userId, jti, token, expiresAt) {
    const record = {
      jti,
      user_id: userId,
      token,
      expires_at: expiresAt,
      revoked: false,
      created_at: new Date().toISOString(),
    };
    this.refreshTokens.set(jti, record);

    if (!this.userRefreshTokens.has(userId)) {
      this.userRefreshTokens.set(userId, new Set());
    }
    this.userRefreshTokens.get(userId).add(jti);

    return record;
  }

  getRefreshToken(jti) {
    return this.refreshTokens.get(jti) || null;
  }

  revokeRefreshToken(jti) {
    const record = this.refreshTokens.get(jti);
    if (!record) return false;
    record.revoked = true;
    return true;
  }

  revokeAllRefreshTokensForUser(userId) {
    const jtis = this.userRefreshTokens.get(userId);
    if (!jtis) return 0;
    let revoked = 0;
    for (const jti of jtis) {
      const record = this.refreshTokens.get(jti);
      if (record && !record.revoked) {
        record.revoked = true;
        revoked += 1;
      }
    }
    this.userRefreshTokens.delete(userId);
    return revoked;
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

