/**
 * Socket.io Integration
 * 
 * Handles real-time WebSocket communication for:
 * - Joining/leaving chat rooms
 * - Sending and receiving messages in real-time
 * - User presence (online/offline)
 * 
 * This file exports a function that takes the HTTP server,
 * attaches Socket.io to it, and sets up all event handlers.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Import your existing database functions — same ones your REST API uses
const { getUserById } = require('./database/users');
const { isUserInRoom, joinRoom } = require('./database/rooms');
const { createMessage } = require('./database/messages');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-for-dev';


/**
 * Initialize Socket.io on the HTTP server
 * 
 * This function is called once from server.js during startup.
 * It attaches Socket.io to the same server that handles your REST API,
 * sets up authentication middleware, and defines all event handlers.
 * 
 * @param {http.Server} server - The HTTP server from server.js
 * @returns {Server} The Socket.io server instance
 */
function initializeSocket(server) {

  // Create the Socket.io server and attach it to your HTTP server.
  // Now port 3000 handles both REST API requests (Express) and
  // WebSocket connections (Socket.io).
  const io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGIN
        : 'http://localhost:3001',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // If WebSocket connection fails, fall back to HTTP long-polling.
    // This ensures it works even on networks that block WebSockets.
    transports: ['websocket', 'polling'],
  });


  // ============================================================
  // AUTHENTICATION MIDDLEWARE
  // ============================================================
  // This runs BEFORE a WebSocket connection is established.
  // Same concept as your Express authenticate middleware,
  // but for WebSocket connections instead of HTTP requests.
  //
  // The client sends their JWT token during the handshake:
  //   io('http://localhost:3000', { auth: { token: 'eyJhb...' } })
  //
  // If the token is invalid, the connection is rejected
  // before any events can be sent or received.

  io.use(async (socket, next) => {
    // socket.handshake contains everything from the initial connection request.
    // The client puts the token in socket.handshake.auth.token
    const token = socket.handshake.auth.token;

    // No token provided — reject the connection
    if (!token) {
      return next(new Error('Authentication required'));
      // Calling next() with an Error rejects the connection.
      // The client receives a 'connect_error' event.
    }

    try {
      // Verify the JWT — same as your Express middleware does
      const payload = jwt.verify(token, JWT_SECRET);

      // Make sure it's an access token, not a refresh token
      if (payload.type !== 'access') {
        return next(new Error('Invalid token type'));
      }

      // Look up the full user from the database
      const user = await getUserById(payload.id);

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach the user to the socket object.
      // Now every event handler can access socket.user
      // to know who is sending the event.
      // Same pattern as req.user in Express.
      socket.user = {
        id: user.id,
        username: user.username,
        email: user.email,
      };

      // Token is valid, user exists — allow the connection
      next();
      // Calling next() without an error means "approved, connect them"

    } catch (error) {
      return next(new Error('Invalid or expired token'));
    }
  });


  // ============================================================
  // CONNECTION HANDLER
  // ============================================================
  // This fires every time an authenticated user connects.
  // Each user gets their own "socket" object that represents
  // their individual connection to the server.

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (socket: ${socket.id})`);
    // socket.id is a unique ID that Socket.io assigns to each connection.
    // Different from user ID — one user could have multiple sockets
    // (e.g., phone and laptop both connected).


    // ============================================================
    // EVENT: join_room
    // ============================================================
    // Client emits this when a user opens a chat room.
    // We do two things:
    //   1. Join the database room (if not already a member)
    //   2. Join the Socket.io room (for live message delivery)

    socket.on('join_room', async (data, callback) => {
      // "data" is whatever the client sends with the event.
      // "callback" is an optional function the client passes
      // so we can send a response back (like a REST API response).
      // Called like: socket.emit('join_room', { roomId: 1 }, (response) => { ... })

      try {
        const roomId = Number(data.roomId);

        if (!roomId || isNaN(roomId)) {
          return callback({ success: false, error: 'Valid room ID is required' });
        }

        const userId = Number(socket.user.id);

        // Join the database room using your existing function.
        // This handles all validation — checks if room exists,
        // if user exists, if already a member, etc.
        await joinRoom(userId, roomId);

        // Join the Socket.io room.
        // This is the temporary, in-memory room for broadcasting.
        // We use a string like 'room_1' to avoid confusion with
        // Socket.io's internal room naming.
        const socketRoom = `room_${roomId}`;
        socket.join(socketRoom);

        console.log(`${socket.user.username} joined room ${roomId}`);

        // Tell everyone else in the room that someone joined.
        // socket.to() sends to everyone in the room EXCEPT the sender.
        socket.to(socketRoom).emit('user_joined', {
          user: socket.user,
          roomId: roomId,
          timestamp: new Date().toISOString(),
        });

        // Send success back to the client who joined
        callback({ success: true, message: `Joined room ${roomId}` });

      } catch (error) {
        console.error('Error joining room:', error.message);
        callback({ success: false, error: error.message });
      }
    });


    // ============================================================
    // EVENT: send_message
    // ============================================================
    // Client emits this when a user sends a message.
    // We save it to PostgreSQL (permanent) and broadcast it
    // to the room (instant delivery to online users).

    socket.on('send_message', async (data, callback) => {
      try {
        const roomId = Number(data.roomId);
        const content = data.content;

        if (!roomId || isNaN(roomId)) {
          return callback({ success: false, error: 'Valid room ID is required' });
        }

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
          return callback({ success: false, error: 'Message content is required' });
        }

        const userId = Number(socket.user.id);

        // Check if the user is actually in this room.
        // Just because they have a valid token doesn't mean
        // they're allowed to post in every room.
        const isMember = await isUserInRoom(userId, roomId);
        if (!isMember) {
          return callback({ success: false, error: 'You must be a member of this room' });
        }

        // Save the message to PostgreSQL using your EXISTING function.
        // Same function your REST API endpoint calls.
        // The message is now permanent — even if all users disconnect,
        // it's in the database.
        const message = await createMessage(roomId, userId, content.trim());

        // Build the message object to broadcast.
        // Include user info so the frontend knows who sent it.
        const messageData = {
          id: message.id,
          room_id: message.room_id,
          content: message.content,
          created_at: message.created_at,
          edited_at: message.edited_at,
          user: {
            id: socket.user.id,
            username: socket.user.username,
            email: socket.user.email,
          },
        };

        // Broadcast to everyone in the room INCLUDING the sender.
        // io.to() sends to everyone. socket.to() excludes the sender.
        // We use io.to() here because the sender's frontend also
        // needs to display the message with the server-assigned ID
        // and timestamp.
        const socketRoom = `room_${roomId}`;
        io.to(socketRoom).emit('new_message', messageData);

        // Confirm to the sender that the message was saved
        callback({ success: true, message: messageData });

      } catch (error) {
        console.error('Error sending message:', error.message);
        callback({ success: false, error: error.message });
      }
    });


    // ============================================================
    // EVENT: leave_room
    // ============================================================
    // Client emits this when a user leaves a chat room.
    // We remove them from the Socket.io room so they stop
    // receiving live messages. We DON'T remove them from the
    // database room — leaving the view isn't the same as
    // leaving the room permanently.

    socket.on('leave_room', (data, callback) => {
      try {
        const roomId = Number(data.roomId);

        if (!roomId || isNaN(roomId)) {
          return callback({ success: false, error: 'Valid room ID is required' });
        }

        const socketRoom = `room_${roomId}`;

        // Tell everyone in the room that this user left
        socket.to(socketRoom).emit('user_left', {
          user: socket.user,
          roomId: roomId,
          timestamp: new Date().toISOString(),
        });

        // Remove from the Socket.io room (stops receiving broadcasts)
        socket.leave(socketRoom);

        console.log(`${socket.user.username} left room ${roomId}`);

        callback({ success: true, message: `Left room ${roomId}` });

      } catch (error) {
        console.error('Error leaving room:', error.message);
        callback({ success: false, error: error.message });
      }
    });


    // ============================================================
    // EVENT: typing
    // ============================================================
    // Client emits this when a user starts or stops typing.
    // We just relay it to the room — no database involved.
    // This is purely a real-time UI feature.

    socket.on('typing', (data) => {
      const roomId = Number(data.roomId);
      if (!roomId) return;

      const socketRoom = `room_${roomId}`;

      // Broadcast to everyone EXCEPT the sender.
      // You don't need to see your own typing indicator.
      socket.to(socketRoom).emit('user_typing', {
        user: socket.user,
        roomId: roomId,
        isTyping: data.isTyping,    // true = started typing, false = stopped
      });
    });


    // ============================================================
    // EVENT: disconnect
    // ============================================================
    // Fires when the user's connection drops — they closed the tab,
    // lost WiFi, or the browser crashed. Socket.io handles this
    // automatically. We just log it and optionally notify rooms.

    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.user.username} (reason: ${reason})`);
      // "reason" tells you why they disconnected:
      // - "transport close" = they closed the tab/browser
      // - "ping timeout" = lost connection (WiFi dropped, etc.)
      // - "client namespace disconnect" = they called socket.disconnect()

      // Socket.io automatically removes them from all rooms
      // when they disconnect, so we don't need to call socket.leave().
    });

  });

  return io;
}


module.exports = initializeSocket;