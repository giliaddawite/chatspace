/**
 * Room Model
 * Represents a chat room
 */

class Room {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description || null;
    this.is_private = data.is_private || false;
    this.max_members = data.max_members || null;
    this.created_by = data.created_by;
    this.created_at = data.created_at || new Date().toISOString();
    this.member_count = data.member_count || 1; // Creator is first member
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      is_private: this.is_private,
      max_members: this.max_members,
      created_by: this.created_by,
      created_at: this.created_at,
      member_count: this.member_count,
    };
  }
}

module.exports = Room;

