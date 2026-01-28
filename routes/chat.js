const express = require('express');
const Chat = require('../models/Chat');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/chat
// @desc    Get all chats for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const chats = await Chat.find({
      participants: req.user._id,
    })
      .populate('participants', 'name username profilePicture')
      .sort({updatedAt: -1});

    res.json(chats);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   POST /api/chat
// @desc    Create or get existing chat
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {receiverId} = req.body;

    if (!receiverId) {
      return res.status(400).json({message: 'Receiver ID is required'});
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: {$all: [req.user._id, receiverId]},
    });

    if (!chat) {
      chat = new Chat({
        participants: [req.user._id, receiverId],
        messages: [],
      });
      await chat.save();
    }

    await chat.populate('participants', 'name username profilePicture');

    res.json(chat);
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   GET /api/chat/:chatId
// @desc    Get chat messages
// @access  Private
router.get('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('participants', 'name username profilePicture');

    if (!chat) {
      return res.status(404).json({message: 'Chat not found'});
    }

    // Check if user is participant
    if (!chat.participants.some((p) => p._id.toString() === req.user._id.toString())) {
      return res.status(403).json({message: 'Not authorized'});
    }

    res.json(chat);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   POST /api/chat/:chatId/message
// @desc    Add message to chat (Socket.io handles real-time, this is for persistence)
// @access  Private
router.post('/:chatId/message', auth, async (req, res) => {
  try {
    const {text} = req.body;

    if (!text) {
      return res.status(400).json({message: 'Message text is required'});
    }

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({message: 'Chat not found'});
    }

    // Check if user is participant
    if (!chat.participants.some((p) => p.toString() === req.user._id.toString())) {
      return res.status(403).json({message: 'Not authorized'});
    }

    chat.messages.push({
      sender: req.user._id,
      text,
      timestamp: new Date(),
    });

    await chat.save();

    res.json(chat);
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;

