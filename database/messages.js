/** Message Database operations
 * 
 * Dependinces : pool (from connections.js)*
 * Function: Create message(roomID, userID, content)
 * Purpose: create a new message in a room
 */

const pool = require('./connection');


async function createMessage(roomID, userID, content) {
    try {
        if(!roomID || typeof roomID !== 'number') {
            throw new Error('Valid room Id required');
        }

        if (!userID || typeof userID !== 'number') {
            throw new Error("Valid room ID required");
        }

        if (!content || typeof content !== 'string') {
            throw new Error("Message content required");
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length === 0) {
            throw new Error('Message content cannot be empty');
        }

        if (trimmedContent.length > 5000) {
            throw new Error('Message content cannot exceed 5000 characters');
        }

        const userCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [userID]
        );

        if (userCheck.rows.length === 0) {
            throw new Error('User not found');
        }

        const roomCheck = await pool.query(
            'SELECT id FROM rooms WHERE id = $1',
            [roomID]
        );

        if (roomCheck.rows.length === 0) {
            throw new Error('Room not found');
        }

        const memberCheck = await pool.query(
            'SELECT * FROM room_members WHERE user_id = $1 AND room_id = $2',
            [userID, roomID]
        );

        if (memberCheck.rows.length === 0) {
            throw new Error('User must be a member of the room to send messages');
        }

        // Insert message
        const result = await pool.query(
            `INSERT INTO messages (room_id, user_id, content, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id, room_id, user_id, content, created_at, edited_at`,
            [roomID, userID, trimmedContent]
        );

        const newMessage = result.rows[0];
        console.log(`Message created: ID ${newMessage.id} in room ${roomID} by user ${userID}`);
        
        return newMessage;

    } catch (error) {
        console.error('Error creating message:', error.message);
        throw error;
    }
}

async function getMessagesByRoom(roomID, options = {}) {
    try {
        if (!roomID || typeof roomID !== 'number') {
            throw new Error('Valid room ID is required');
        }

        let limit = options.limit || 50;
        limit = Math.min(limit, 100);

        let query = `SELECT m.id, m.room_id, m.user_id, m.content, m.created_at, m.edited_at, u.id as user_id, u.username, u.email
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.room_id = $1`;

        const params = [roomID];
        let paramIndex = 2;

        if (options.before) {
            query += ` AND m.created_at < $${paramIndex}`;
            params.push(options.before);
            paramIndex++;
        }

        if (options.after) {
            query += ` AND m.created_at > $${paramIndex}`;
            params.push(options.after);
            paramIndex++;
        }

        // Order by newest first, then limit
        query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex}`;
        params.push(limit);

        const result = await pool.query(query, params);

        // Format messages with user object
        const messages = result.rows.map(row => ({
            id: row.id,
            room_id: row.room_id,
            content: row.content,
            created_at: row.created_at,
            edited_at: row.edited_at,
            user: row.user_id ? {
                id: row.user_id,
                username: row.username,
                email: row.email
            } : null // Handle case where user was deleted
        }));

        // Calculate pagination info
        const oldestTimestamp = messages.length > 0 
            ? messages[messages.length - 1].created_at 
            : null;

        return {
            messages,
            pagination: {
                returned_count: messages.length,
                has_more: messages.length === limit, // If we got full limit, there might be more
                oldest_timestamp: oldestTimestamp
            }
        };

    } catch (error) {
        console.error('Error getting messages:', error.message);
        throw error;
    }
}

/**
 * Get a specific message by ID
 * 
 * @param {number} messageId - Message ID
 * @returns {Promise<Object|null>} Message object or null if not found
 */
async function getMessageById(messageId) {
    try {
        if (!messageId || typeof messageId !== 'number') {
            throw new Error('Valid message ID is required');
        }

        const result = await pool.query(
            `SELECT m.id, m.room_id, m.user_id, m.content, m.created_at, m.edited_at,
                    u.username, u.email
             FROM messages m
             LEFT JOIN users u ON m.user_id = u.id
             WHERE m.id = $1`,
            [messageId]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            room_id: row.room_id,
            content: row.content,
            created_at: row.created_at,
            edited_at: row.edited_at,
            user: row.user_id ? {
                id: row.user_id,
                username: row.username,
                email: row.email
            } : null
        };

    } catch (error) {
        console.error('Error getting message by ID:', error.message);
        throw error;
    }
}

/**
 * Update a message (only by the author)
 * 
 * @param {number} messageId - Message ID
 * @param {number} userId - User ID (must be the author)
 * @param {string} newContent - New message content
 * @returns {Promise<Object>} Updated message object
 * @throws {Error} If not the author or validation fails
 */
async function updateMessage(messageId, userId, newContent) {
    try {
        // Input validation
        if (!messageId || typeof messageId !== 'number') {
            throw new Error('Valid message ID is required');
        }

        if (!userId || typeof userId !== 'number') {
            throw new Error('Valid user ID is required');
        }

        if (!newContent || typeof newContent !== 'string') {
            throw new Error('Message content is required');
        }

        const trimmedContent = newContent.trim();
        if (trimmedContent.length === 0) {
            throw new Error('Message content cannot be empty');
        }

        if (trimmedContent.length > 5000) {
            throw new Error('Message content cannot exceed 5000 characters');
        }

        // Get the message
        const messageCheck = await pool.query(
            'SELECT * FROM messages WHERE id = $1',
            [messageId]
        );

        if (messageCheck.rows.length === 0) {
            throw new Error('Message not found');
        }

        const message = messageCheck.rows[0];

        // Check ownership
        if (message.user_id !== userId) {
            throw new Error('You can only edit your own messages');
        }

        // Update the message
        const result = await pool.query(
            `UPDATE messages
             SET content = $1, edited_at = NOW()
             WHERE id = $2
             RETURNING id, room_id, user_id, content, created_at, edited_at`,
            [trimmedContent, messageId]
        );

        const updatedMessage = result.rows[0];
        console.log(`Message ${messageId} updated by user ${userId}`);
        
        return updatedMessage;

    } catch (error) {
        console.error('Error updating message:', error.message);
        throw error;
    }
}

/**
 * Delete a message (only by the author)
 * 
 * @param {number} messageId - Message ID
 * @param {number} userId - User ID (must be the author)
 * @returns {Promise<Object>} Success message
 * @throws {Error} If not the author
 */
async function deleteMessage(messageId, userId) {
    try {
        // Input validation
        if (!messageId || typeof messageId !== 'number') {
            throw new Error('Valid message ID is required');
        }

        if (!userId || typeof userId !== 'number') {
            throw new Error('Valid user ID is required');
        }

        // Get the message
        const messageCheck = await pool.query(
            'SELECT * FROM messages WHERE id = $1',
            [messageId]
        );

        if (messageCheck.rows.length === 0) {
            throw new Error('Message not found');
        }

        const message = messageCheck.rows[0];

        // Check ownership
        if (message.user_id !== userId) {
            throw new Error('You can only delete your own messages');
        }

        // Delete the message
        await pool.query(
            'DELETE FROM messages WHERE id = $1',
            [messageId]
        );

        console.log(`Message ${messageId} deleted by user ${userId}`);
        
        return {
            success: true,
            message: 'Message deleted successfully'
        };

    } catch (error) {
        console.error('Error deleting message:', error.message);
        throw error;
    }
}

/**
 * Get total message count for a room
 * 
 * @param {number} roomId - Room ID
 * @returns {Promise<number>} Total message count
 */
async function getMessageCount(roomId) {
    try {
        if (!roomId || typeof roomId !== 'number') {
            throw new Error('Valid room ID is required');
        }

        const result = await pool.query(
            'SELECT COUNT(*) as count FROM messages WHERE room_id = $1',
            [roomId]
        );

        return parseInt(result.rows[0].count);

    } catch (error) {
        console.error('Error getting message count:', error.message);
        throw error;
    }
}

// Export all functions
module.exports = {
    createMessage,
    getMessagesByRoom,
    getMessageById,
    updateMessage,
    deleteMessage,
    getMessageCount
};