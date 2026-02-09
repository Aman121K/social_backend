const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/stories', require('./routes/stories'));
const notificationsRoute = require('./routes/notifications');
app.use('/api/notifications', notificationsRoute.router);
app.use('/api/search', require('./routes/search'));

// Socket.io connection handling – all handlers wrapped so connection issues never crash the server
io.on('connection', (socket) => {
  try {
    console.log('User connected:', socket.id);
  } catch (e) {
    console.error('Socket connection log error:', e.message);
  }

  socket.on('join-room', (userId) => {
    try {
      if (userId) {
        socket.join(`user-${userId}`);
        console.log(`User ${userId} joined their room`);
      }
    } catch (e) {
      console.error('join-room error:', e.message);
    }
  });

  socket.on('send-message', (data) => {
    try {
      const receiverId = data && data.receiverId;
      const message = data && data.message;
      const senderId = data && data.senderId;
      if (receiverId != null) {
        io.to(`user-${receiverId}`).emit('receive-message', {
          senderId,
          message: message != null ? message : '',
          timestamp: new Date(),
        });
      }
    } catch (e) {
      console.error('send-message error:', e.message);
    }
  });

  socket.on('disconnect', (reason) => {
    try {
      console.log('User disconnected:', socket.id, reason);
    } catch (e) {
      console.error('Socket disconnect log error:', e.message);
    }
  });

  socket.on('error', (err) => {
    try {
      console.error('Socket error:', err && err.message);
    } catch (e) {
      console.error('Socket error handler:', e.message);
    }
  });
});

io.engine.on('connection_error', (err) => {
  try {
    console.error('Socket.io connection_error:', err && err.message);
  } catch (e) {
    console.error('connection_error handler:', e.message);
  }
});

// MongoDB Connection
// Use MONGO_URI or MONGODB_URI in .env. If password has @ or #, use percent-encoding (e.g. @ → %40)
const defaultUri = 'mongodb://127.0.0.1:27017/social_db';
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || defaultUri;

mongoose
  .connect(mongoUri)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = {io};

