# Social Backend API

A complete backend API for Social built with Node.js, Express, MongoDB, and Socket.io.

## Features

- User Authentication (Signup, Signin, OTP Verification, Logout)
- Post Management (Create, Read, Like/Unlike, Delete)
- Comment System (Add, Read, Like/Unlike, Delete)
- Real-time Chat with Socket.io
- User Profile Management
- Follow/Unfollow Users

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Update the following variables:
     ```
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/instagram-clone
     JWT_SECRET=your_super_secret_jwt_key
     EMAIL_USER=your_email@gmail.com
     EMAIL_PASS=your_app_password
     ```

3. **Start MongoDB**
   - Make sure MongoDB is running on your system
   - Or use MongoDB Atlas (cloud)

4. **Run the Server**
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/verify-otp` - Verify email with OTP
- `POST /api/auth/signin` - Login user
- `POST /api/auth/resend-otp` - Resend OTP
- `GET /api/auth/me` - Get current user (Protected)
- `POST /api/auth/logout` - Logout user (Protected)

### Posts
- `POST /api/posts` - Create a post (Protected)
- `GET /api/posts` - Get all posts (feed) (Protected)
- `GET /api/posts/:id` - Get single post (Protected)
- `POST /api/posts/:id/like` - Like/Unlike post (Protected)
- `DELETE /api/posts/:id` - Delete post (Protected)

### Comments
- `POST /api/comments` - Add comment (Protected)
- `GET /api/comments/post/:postId` - Get all comments for a post (Protected)
- `POST /api/comments/:id/like` - Like/Unlike comment (Protected)
- `DELETE /api/comments/:id` - Delete comment (Protected)

### Users
- `GET /api/users/:id` - Get user profile (Protected)
- `PUT /api/users/profile` - Update profile (Protected)
- `POST /api/users/:id/follow` - Follow/Unfollow user (Protected)

### Chat
- `GET /api/chat` - Get all chats (Protected)
- `POST /api/chat` - Create or get chat (Protected)
- `GET /api/chat/:chatId` - Get chat messages (Protected)
- `POST /api/chat/:chatId/message` - Add message (Protected)

## Socket.io Events

### Client to Server
- `join-room` - Join user's room (userId)
- `send-message` - Send message (receiverId, message, senderId)

### Server to Client
- `receive-message` - Receive new message (senderId, message, timestamp)

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Notes

- OTP expires in 10 minutes
- JWT tokens expire in 30 days
- Image URLs should be provided as base64 or external URLs (you can integrate with cloud storage like AWS S3, Cloudinary, etc.)

