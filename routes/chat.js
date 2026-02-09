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
// @desc    Create or get existing chat. Only allowed when both users follow each other.
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {receiverId} = req.body;

    if (!receiverId) {
      return res.status(400).json({message: 'Receiver ID is required'});
    }

    const currentUserId = req.user._id.toString();
    const receiverIdStr = receiverId.toString();
    if (currentUserId === receiverIdStr) {
      return res.status(400).json({message: 'Cannot start a chat with yourself'});
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({message: 'User not found'});
    }

    const currentUser = await User.findById(req.user._id).select('following');
    const currentFollowing = (currentUser.following || []).map((id) => id.toString());
    const receiverFollowing = (receiver.following || []).map((id) => id.toString());
    const mutualFollow =
      currentFollowing.includes(receiverIdStr) && receiverFollowing.includes(currentUserId);
    if (!mutualFollow) {
      return res.status(403).json({
        message: 'You can only message users who follow you back. Send a follow request and wait for them to accept.',
      });
    }

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
// @desc    Get chat with all messages (from DB) for backup/restore
// @access  Private
router.get('/:chatId', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate('participants', 'name username profilePicture')
      .populate('messages.sender', 'name username profilePicture');

    if (!chat) {
      return res.status(404).json({message: 'Chat not found'});
    }

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

