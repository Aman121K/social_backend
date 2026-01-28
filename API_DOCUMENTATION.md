# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please verify your email with OTP.",
  "userId": "user_id_here"
}
```

### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "Email verified successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "profilePicture": ""
  }
}
```

### Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "profilePicture": "",
    "bio": "",
    "website": "",
    "phone": ""
  }
}
```

### Resend OTP
```http
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

## Post Endpoints

### Get All Posts (Feed)
```http
GET /api/posts
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "post_id",
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "username": "johndoe",
      "profilePicture": ""
    },
    "image": "image_url",
    "caption": "Post caption",
    "location": "Location",
    "likes": ["user_id1", "user_id2"],
    "comments": ["comment_id1"],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Create Post
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "image": "image_url_or_base64",
  "caption": "My post caption",
  "location": "New York, USA"
}
```

### Like/Unlike Post
```http
POST /api/posts/:postId/like
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Post liked",
  "likes": 10,
  "isLiked": true
}
```

### Delete Post
```http
DELETE /api/posts/:postId
Authorization: Bearer <token>
```

---

## Comment Endpoints

### Get Comments for Post
```http
GET /api/comments/post/:postId
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "_id": "comment_id",
    "post": "post_id",
    "user": {
      "_id": "user_id",
      "name": "Jane Doe",
      "username": "janedoe",
      "profilePicture": ""
    },
    "text": "Great post!",
    "likes": ["user_id1"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### Add Comment
```http
POST /api/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "postId": "post_id",
  "text": "Great post!"
}
```

### Like/Unlike Comment
```http
POST /api/comments/:commentId/like
Authorization: Bearer <token>
```

### Delete Comment
```http
DELETE /api/comments/:commentId
Authorization: Bearer <token>
```

---

## User Endpoints

### Get User Profile
```http
GET /api/users/:userId
Authorization: Bearer <token>
```

### Update Profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "bio": "My bio",
  "website": "https://example.com",
  "phone": "+1234567890",
  "profilePicture": "image_url"
}
```

### Follow/Unfollow User
```http
POST /api/users/:userId/follow
Authorization: Bearer <token>
```

---

## Chat Endpoints

### Get All Chats
```http
GET /api/chat
Authorization: Bearer <token>
```

### Create or Get Chat
```http
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "receiverId": "user_id"
}
```

### Get Chat Messages
```http
GET /api/chat/:chatId
Authorization: Bearer <token>
```

### Add Message (for persistence)
```http
POST /api/chat/:chatId/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Hello!"
}
```

---

## Socket.io Events

### Client → Server

**Join Room**
```javascript
socket.emit('join-room', userId);
```

**Send Message**
```javascript
socket.emit('send-message', {
  receiverId: 'user_id',
  message: 'Hello!',
  senderId: 'current_user_id'
});
```

### Server → Client

**Receive Message**
```javascript
socket.on('receive-message', (data) => {
  // data: { senderId, message, timestamp }
});
```

---

## Error Responses

All errors follow this format:
```json
{
  "message": "Error message here"
}
```

Common status codes:
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

