-- ============================================
-- CHAT APP DATABASE SCHEMA
-- Purpose: Store users, rooms, messages
-- ============================================

-- ============================================
-- CLEAN SLATE: Drop existing tables
-- ============================================

DROP TABLE IF EXISTS room_members CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- TABLE 1: users
-- ============================================
-- Purpose: Store user account information
-- Primary Key: id (auto-incrementing number)

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT username_length CHECK (LENGTH(username) >= 3 AND LENGTH(username) <= 20),
    CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_email ON users (email);

-- ============================================
-- TABLE 2: rooms
-- ============================================
-- Purpose: Store chat rooms
-- Primary Key: id

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT room_name_length CHECK (LENGTH(name) >= 3 AND LENGTH(name) <= 50)
);

CREATE INDEX idx_rooms_created_by ON rooms (created_by);

-- ============================================
-- TABLE 3: messages
-- ============================================
-- Purpose: Store all chat messages
-- Primary Key: id

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    edited_at TIMESTAMP,
    CONSTRAINT content_length CHECK (LENGTH(content) >= 1 AND LENGTH(content) <= 1000)
);

CREATE INDEX idx_messages_room_created ON messages (room_id, created_at DESC);
CREATE INDEX idx_messages_user_created ON messages (user_id);

-- ============================================
-- TABLE 4: room_members
-- ============================================
-- Purpose: Track which users are members of which rooms
-- This is a "junction table" or "join table" for many-to-many relationship

CREATE TABLE room_members (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, room_id)
);

CREATE INDEX idx_room_members_room ON room_members (room_id);
