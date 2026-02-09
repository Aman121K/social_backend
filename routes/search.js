const express = require('express');
const {body, validationResult} = require('express-validator');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/search
// @desc    Search for posts and users
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {q, type = 'all'} = req.query;

    if (!q || q.trim() === '') {
      return res.json({
        posts: [],
        users: [],
      });
    }

    const searchQuery = q.trim();

    if (type === 'posts' || type === 'all') {
      // Search posts by text/caption
      const posts = await Post.find({
        $or: [
          {text: {$regex: searchQuery, $options: 'i'}},
          {caption: {$regex: searchQuery, $options: 'i'}},
        ],
      })
        .populate('user', 'name username profilePicture verified')
        .populate('retweetedBy', 'name username profilePicture verified')
        .sort({createdAt: -1})
        .limit(20);

      if (type === 'posts') {
        return res.json({posts});
      }
    }

    if (type === 'users' || type === 'all') {
      // Search users by name or username
      const users = await User.find({
        $or: [
          {name: {$regex: searchQuery, $options: 'i'}},
          {username: {$regex: searchQuery, $options: 'i'}},
        ],
      })
        .select('-password -otp -otpExpiry')
        .limit(20);

      if (type === 'users') {
        return res.json({users});
      }
    }

    // Return both if type is 'all'
    const posts = await Post.find({
      $or: [
        {text: {$regex: searchQuery, $options: 'i'}},
        {caption: {$regex: searchQuery, $options: 'i'}},
      ],
    })
      .populate('user', 'name username profilePicture verified')
      .populate('retweetedBy', 'name username profilePicture verified')
      .sort({createdAt: -1})
      .limit(20);

    const users = await User.find({
      $or: [
        {name: {$regex: searchQuery, $options: 'i'}},
        {username: {$regex: searchQuery, $options: 'i'}},
      ],
    })
      .select('-password -otp -otpExpiry')
      .limit(20);

    res.json({
      posts,
      users,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   GET /api/search/hashtag/:hashtag
// @desc    Search posts by hashtag
// @access  Private
router.get('/hashtag/:hashtag', auth, async (req, res) => {
  try {
    const hashtag = req.params.hashtag.replace('#', '');
    const searchQuery = `#${hashtag}`;

    const posts = await Post.find({
      $or: [
        {text: {$regex: searchQuery, $options: 'i'}},
        {caption: {$regex: searchQuery, $options: 'i'}},
      ],
    })
      .populate('user', 'name username profilePicture verified')
      .populate('retweetedBy', 'name username profilePicture verified')
      .sort({createdAt: -1})
      .limit(50);

    res.json(posts);
  } catch (error) {
    console.error('Hashtag search error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   GET /api/search/mention/:username
// @desc    Search posts mentioning a user
// @access  Private
router.get('/mention/:username', auth, async (req, res) => {
  try {
    const username = req.params.username.replace('@', '');
    const searchQuery = `@${username}`;

    const posts = await Post.find({
      $or: [
        {text: {$regex: searchQuery, $options: 'i'}},
        {caption: {$regex: searchQuery, $options: 'i'}},
      ],
    })
      .populate('user', 'name username profilePicture verified')
      .populate('retweetedBy', 'name username profilePicture verified')
      .sort({createdAt: -1})
      .limit(50);

    res.json(posts);
  } catch (error) {
    console.error('Mention search error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;
