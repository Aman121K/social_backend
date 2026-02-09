# Tweetster Backend API

A complete backend API for Tweetster (Twitter Clone) built with Node.js, Express, MongoDB, and Socket.io.

## Features

- User Authentication (Signup, Signin, OTP Verification, Logout)
- Tweet Management (Create, Read, Like, Retweet, Delete)
- Comment System (Add, Read, Like, Delete)
- Real-time Chat with Socket.io
- User Profile Management
- Follow/Unfollow Users
- Notifications System
- Search Functionality (Posts, Users, Hashtags, Mentions)
- Verified Account System
- Email/Password Update

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
     MONGODB_URI=mongodb://localhost:27017/tweetster
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
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP
- `GET /api/auth/me` - Get current user (Protected)
- `POST /api/auth/logout` - Logout user (Protected)

### Tweets/Posts
- `POST /api/posts` - Create a tweet (Protected)
- `GET /api/posts` - Get all tweets (feed) (Protected)
- `GET /api/posts/:id` - Get single tweet (Protected)
- `POST /api/posts/:id/like` - Like/Unlike tweet (Protected)
- `POST /api/posts/:id/retweet` - Retweet/Unretweet (Protected)
- `DELETE /api/posts/:id` - Delete tweet (Protected)

### Comments
- `POST /api/comments` - Add comment (Protected)
- `GET /api/comments/post/:postId` - Get all comments for a tweet (Protected)
- `POST /api/comments/:id/like` - Like/Unlike comment (Protected)
- `DELETE /api/comments/:id` - Delete comment (Protected)

### Users
- `GET /api/users/:id` - Get user profile (Protected)
- `PUT /api/users/profile` - Update profile (Protected)
- `PUT /api/users/email` - Update email (Protected)
- `PUT /api/users/password` - Update password (Protected)
- `POST /api/users/:id/follow` - Follow/Unfollow user (Protected)
- `POST /api/users/apply-verification` - Apply for verified badge (Protected)
- `DELETE /api/users/delete-account` - Delete account (Protected)

### Notifications
- `GET /api/notifications` - Get all notifications (Protected)
- `PUT /api/notifications/:id/read` - Mark notification as read (Protected)
- `PUT /api/notifications/read-all` - Mark all as read (Protected)

### Search
- `GET /api/search?q=query&type=all|posts|users` - Search posts and users (Protected)
- `GET /api/search/hashtag/:hashtag` - Search by hashtag (Protected)
- `GET /api/search/mention/:username` - Search by mention (Protected)

### Chat
- `GET /api/chat` - Get all chats (Protected)
- `POST /api/chat` - Create or get chat (Protected)
- `GET /api/chat/:chatId` - Get chat messages (Protected)
- `POST /api/chat/:chatId/message` - Add message (Protected)

## Data Models

### User
- name, username, email, password
- profilePicture, bio, website, phone
- verified, isVerified
- verificationApplication (status, appliedAt, reason)
- followers, following
- otp, otpExpiry

### Post (Tweet)
- user, text, image, video
- originalPost (for retweets)
- retweetedBy
- likes, retweets, comments
- createdAt, updatedAt

### Notification
- user, type (like, comment, retweet, follow, mention)
- fromUser, post, comment
- read, createdAt

## Socket.io Events

### Client → Server
- `join-room` - Join user's room (userId)
- `send-message` - Send message (receiverId, message, senderId)

### Server → Client
- `receive-message` - Receive new message (senderId, message, timestamp)

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Notes

- OTP expires in 10 minutes
- JWT tokens expire in 30 days
- Tweet character limit: 280 characters
- Image/Video URLs should be provided as base64 or external URLs
- Verified badge requires application and admin approval
