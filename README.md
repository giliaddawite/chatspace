# ChatSpace

A real-time chat application built with React, Node.js, and Socket.io.

**Live demo:** https://real-time-chat-7a965.web.app

---

## Features

- Real-time messaging with Socket.io
- JWT authentication with refresh token rotation and revocation
- Create and join chat rooms
- Message history with pagination
- Typing indicators
- Rate limiting on auth endpoints

## Tech Stack

**Frontend** — React, Tailwind CSS, Socket.io-client, Axios

**Backend** — Node.js, Express, Socket.io, PostgreSQL, bcrypt, JWT

## Running Locally

**Prerequisites:** Node.js, PostgreSQL

**1. Clone and install**
```bash
git clone https://github.com/giliaddawite/chatspace.git
cd chatspace
npm install
cd client && npm install
```

**2. Set up the database**
```bash
psql -U postgres -c "CREATE DATABASE chatapp;"
psql -U postgres -d chatapp -f database/schema.sql
```

**3. Configure environment variables**

Create a `.env` file in the root:
```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/chatapp
JWT_SECRET=your_secret_here
REFRESH_SECRET=your_refresh_secret_here
PORT=3000
NODE_ENV=development
```

**4. Start the servers**
```bash
# Backend (from root)
npm run dev

# Frontend (from /client)
npm start
```

App runs at `http://localhost:3001`.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout and revoke tokens |
| GET | `/api/v1/rooms` | List rooms |
| POST | `/api/v1/rooms` | Create a room |
| GET | `/api/v1/rooms/:id/messages` | Get messages |
| POST | `/api/v1/rooms/:id/messages` | Send a message |
