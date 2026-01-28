const express = require('express');
const {body, validationResult} = require('express-validator');
const Post = require('../models/Post');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post(
  '/',
  auth,
  [
    body('image').notEmpty().withMessage('Image is required'),
    body('caption').optional().isLength({max: 2200}).withMessage('Caption too long'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {image, caption, location} = req.body;

      const post = new Post({
        user: req.user._id,
        image,
        caption: caption || '',
        location: location || '',
      });

      await post.save();
      await post.populate('user', 'name username profilePicture');

      res.status(201).json(post);
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   GET /api/posts
// @desc    Get all posts (feed)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'name username profilePicture')
      .populate('likes', 'name username profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name username profilePicture',
        },
      })
      .sort({createdAt: -1});

    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   GET /api/posts/:id
// @desc    Get a single post
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name username profilePicture')
      .populate('likes', 'name username profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name username profilePicture',
        },
      });

    if (!post) {
      return res.status(404).json({message: 'Post not found'});
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   POST /api/posts/:id/like
// @desc    Like/Unlike a post
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({message: 'Post not found'});
    }

    // Check if user already liked the post (compare as strings to handle ObjectId comparison)
    const isLiked = post.likes.some(
      (likeId) => likeId.toString() === req.user._id.toString()
    );

    if (isLiked) {
      // Unlike - remove user ID from likes array
      post.likes = post.likes.filter(
        (id) => id.toString() !== req.user._id.toString()
      );
    } else {
      // Like - add user ID to likes array
      post.likes.push(req.user._id);
    }

    await post.save();

    // Return updated post with populated user info
    await post.populate('user', 'name username profilePicture');

    res.json({
      message: isLiked ? 'Post unliked' : 'Post liked',
      likes: post.likes.length,
      isLiked: !isLiked,
      post: post,
    });
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({message: 'Post not found'});
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({message: 'Not authorized'});
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({message: 'Post deleted successfully'});
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;

