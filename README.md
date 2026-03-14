# Real-Time Chat API

A RESTful API for a real-time chat application, following best practices for API design.

## Features

- ✅ RESTful API design with versioning (`/api/v1/`)
- ✅ Room creation and management
- ✅ Message retrieval with pagination
- ✅ Authentication middleware
- ✅ Input validation
- ✅ Comprehensive error handling
- ✅ In-memory database (easily replaceable with real DB)

## Getting Started

### Installation

```bash
npm install
```

### Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:3000` by default.

## API Documentation

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-token>
```

### Endpoints

#### POST /api/v1/rooms

Create a new chat room.

**Authentication**: Required

**Request Body**:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| name | string | Yes | 3-50 characters, unique |
| description | string | No | Max 200 characters |
| is_private | boolean | No | Default: false |
| max_members | integer | No | Default: unlimited |

**Example Request**:

```json
{
  "name": "React Developers",
  "description": "A place for React enthusiasts"
}
```

**Success Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "room": {
      "id": 1,
      "name": "React Developers",
      "description": "A place for React enthusiasts",
      "is_private": false,
      "max_members": null,
      "created_by": "john_doe",
      "created_at": "2025-01-15T12:30:00Z",
      "member_count": 1
    }
  }
}
```

**Error Responses**:

- `400` - Validation error or room name already exists
- `401` - Not authenticated
- `500` - Server error

---

#### GET /api/v1/rooms

Get list of rooms with pagination, filtering, and sorting.

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page |
| is_private | boolean | - | Filter by privacy |
| sort_by | string | created_at | Sort field |
| order | string | desc | Sort order (asc/desc) |
| search | string | - | Search by room name |

**Example Request**:

```
GET /api/v1/rooms?page=1&limit=20&is_private=false&sort_by=created_at&order=desc
```

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "rooms": [...],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 100,
      "per_page": 20,
      "has_next": true,
      "has_previous": false
    }
  }
}
```

---

#### GET /api/v1/rooms/:roomId

Get a specific room by ID.

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "room": {
      "id": 1,
      "name": "React Developers",
      ...
    }
  }
}
```

**Error Responses**:

- `404` - Room not found

---

#### GET /api/v1/rooms/:roomId/messages

Get messages from a specific room.

**Authentication**: Required

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 50 | Max messages to return (max 100) |
| before | string | - | ISO timestamp - get messages before this time |

**Example Request**:

```
GET /api/v1/rooms/1/messages?limit=50&before=2025-01-15T12:00:00Z
```

**Success Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "content": "Hey everyone!",
        "user": {
          "id": 1,
          "username": "john_doe",
          "avatar_url": null
        },
        "timestamp": "2025-01-15T11:59:00Z",
        "edited_at": null,
        "is_edited": false
      }
    ],
    "pagination": {
      "oldest_timestamp": "2025-01-15T11:00:00Z",
      "has_more": true,
      "returned_count": 50
    }
  }
}
```

**Error Responses**:

- `403` - User not a member of the room
- `404` - Room does not exist
- `401` - Not authenticated

---

#### POST /api/v1/rooms/:roomId/messages

Create a new message in a room.

**Authentication**: Required

**Request Body**:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| content | string | Yes | 1-1000 characters |

**Example Request**:

```json
{
  "content": "Hello everyone!"
}
```

**Success Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "message": {
      "id": 1,
      "content": "Hello everyone!",
      "user": {
        "id": 1,
        "username": "john_doe",
        "avatar_url": null
      },
      "timestamp": "2025-01-15T12:30:00Z",
      "edited_at": null,
      "is_edited": false
    }
  }
}
```

**Error Responses**:

- `400` - Validation error
- `403` - User not a member of the room
- `404` - Room does not exist
- `401` - Not authenticated

---

## Testing with cURL

### Create a Room

```bash
curl -X POST http://localhost:3000/api/v1/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token-123" \
  -d '{
    "name": "React Developers",
    "description": "A place for React enthusiasts"
  }'
```

### Get Messages

```bash
curl -X GET "http://localhost:3000/api/v1/rooms/1/messages?limit=50" \
  -H "Authorization: Bearer test-token-123"
```

### Send a Message

```bash
curl -X POST http://localhost:3000/api/v1/rooms/1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token-123" \
  -d '{
    "content": "Hello everyone!"
  }'
```

## Project Structure

```
.
├── server.js              # Main server file
├── routes/
│   ├── rooms.js          # Room endpoints
│   └── messages.js       # Message endpoints
├── middleware/
│   ├── auth.js           # Authentication middleware
│   └── validation.js     # Request validation
├── models/
│   ├── Room.js           # Room model
│   └── Message.js        # Message model
├── storage/
│   └── database.js       # In-memory database
└── package.json
```

## Next Steps

To make this production-ready:

1. **Replace in-memory database** with PostgreSQL/MongoDB
2. **Implement JWT authentication** in `middleware/auth.js`
3. **Add WebSocket support** for real-time messaging
4. **Add rate limiting** to prevent abuse
5. **Add logging** (Winston, Pino)
6. **Add tests** (Jest, Supertest)
7. **Add database migrations** (if using SQL)
8. **Add environment variables** for configuration

## License

ISC

