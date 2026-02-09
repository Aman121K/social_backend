const express = require('express');
const Notification = require('../models/Notification');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get all notifications for current user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({user: req.user._id})
      .populate('fromUser', 'name username profilePicture verified')
      .populate('post', 'text caption image')
      .populate('comment', 'text')
      .sort({createdAt: -1})
      .limit(50);

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({message: 'Notification not found'});
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({message: 'Not authorized'});
    }

    notification.read = true;
    await notification.save();

    res.json({message: 'Notification marked as read'});
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      {user: req.user._id, read: false},
      {read: true}
    );

    res.json({message: 'All notifications marked as read'});
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// Helper function to create notification
const createNotification = async (userId, type, fromUserId, postId = null, commentId = null) => {
  try {
    // Don't create notification if user is notifying themselves
    if (userId.toString() === fromUserId.toString()) {
      return;
    }

    const notification = new Notification({
      user: userId,
      type,
      fromUser: fromUserId,
      post: postId,
      comment: commentId,
    });

    await notification.save();
  } catch (error) {
    console.error('Create notification error:', error);
  }
};

module.exports = {router, createNotification};
