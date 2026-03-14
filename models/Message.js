/**
 * Message Model
 * Represents a chat message
 */

class Message {
  constructor(data) {
    this.id = data.id;
    this.content = data.content;
    this.room_id = data.room_id;
    this.user = data.user; // { id, username, avatar_url }
    this.timestamp = data.timestamp || new Date().toISOString();
    this.edited_at = data.edited_at || null;
    this.is_edited = data.is_edited || false;
  }

  toJSON() {
    return {
      id: this.id,
      content: this.content,
      room_id: this.room_id,
      user: this.user,
      timestamp: this.timestamp,
      edited_at: this.edited_at,
      is_edited: this.is_edited,
    };
  }
}

module.exports = Message;

