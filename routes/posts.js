const express = require('express');
const {body, validationResult} = require('express-validator');
const Post = require('../models/Post');
const User = require('../models/User');
const PostReport = require('../models/PostReport');
const auth = require('../middleware/auth');
const {createNotification} = require('./notifications');

const router = express.Router();

// @route   POST /api/posts
// @desc    Create a new tweet/post
// @access  Private
router.post(
  '/',
  auth,
  [
    body('text').optional().isLength({max: 280}).withMessage('Tweet text too long'),
    body('caption').optional().isLength({max: 280}).withMessage('Caption too long'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {text, caption, image, video} = req.body;

      // At least one of text, caption, image, or video must be provided
      if (!text && !caption && !image && !video) {
        return res.status(400).json({message: 'Tweet content is required'});
      }

      const post = new Post({
        user: req.user._id,
        text: text || caption || '',
        caption: caption || text || '',
        image: image || '',
        video: video || '',
      });

      await post.save();
      await post.populate('user', 'name username profilePicture verified');

      // Notify followers that this user created a new post
      try {
        const author = await User.findById(req.user._id).select('followers');
        const followerIds = author?.followers || [];
        for (const followerId of followerIds) {
          await createNotification(followerId, 'new_post', req.user._id, post._id);
        }
      } catch (e) {
        console.error('Notify followers error:', e);
      }

      // Create notifications for mentions
      const mentionRegex = /@(\w+)/g;
      const mentions = post.text.match(mentionRegex) || post.caption.match(mentionRegex) || [];
      for (const mention of mentions) {
        const username = mention.replace('@', '').toLowerCase();
        const mentionedUser = await User.findOne({username});
        if (mentionedUser) {
          await createNotification(mentionedUser._id, 'mention', req.user._id, post._id);
        }
      }

      res.status(201).json(post);
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   GET /api/posts
// @desc    Get all posts/tweets (feed). Excludes posts from blocked users and posts reported by current user.
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId).select('blockedUsers').lean();
    const blockedIds = (currentUser?.blockedUsers || []).map((id) => id && id.toString ? id.toString() : id).filter(Boolean);

    const reportedDocs = await PostReport.find({ reporter: currentUserId }).select('post').lean();
    const reportedIds = (reportedDocs || []).map((r) => r.post).filter(Boolean);

    const filter = {};
    if (blockedIds.length) filter.user = { $nin: blockedIds };
    if (reportedIds.length) filter._id = { $nin: reportedIds };

    const posts = await Post.find(filter)
      .populate('user', 'name username profilePicture verified')
      .populate('retweetedBy', 'name username profilePicture verified')
      .populate('originalPost')
      .populate('likes', 'name username profilePicture')
      .populate('retweets', 'name username profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name username profilePicture verified',
        },
      })
      .sort({createdAt: -1})
      .lean();

    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   POST /api/posts/:id/report
// @desc    Report a post (hides it from reporter's feed)
// @access  Private
router.post('/:id/report', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({message: 'Post not found'});
    const reporterId = req.user._id;
    await PostReport.findOneAndUpdate(
      { reporter: reporterId, post: post._id },
      { reporter: reporterId, post: post._id },
      { upsert: true, new: true }
    );
    res.json({ message: 'Post reported. It will be hidden from your feed.' });
  } catch (error) {
    console.error('Report post error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   GET /api/posts/:id
// @desc    Get a single post/tweet
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name username profilePicture verified')
      .populate('retweetedBy', 'name username profilePicture verified')
      .populate('originalPost')
      .populate('likes', 'name username profilePicture')
      .populate('retweets', 'name username profilePicture')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'name username profilePicture verified',
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

// @route   POST /api/posts/:id/retweet
// @desc    Retweet a post
// @access  Private
router.post('/:id/retweet', auth, async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);

    if (!originalPost) {
      return res.status(404).json({message: 'Post not found'});
    }

    // Check if user already retweeted
    const isRetweeted = originalPost.retweets.some(
      (userId) => userId.toString() === req.user._id.toString()
    );

    if (isRetweeted) {
      // Unretweet - remove from retweets
      originalPost.retweets = originalPost.retweets.filter(
        (id) => id.toString() !== req.user._id.toString()
      );
      await originalPost.save();

      // Delete retweet post if exists
      await Post.findOneAndDelete({
        originalPost: originalPost._id,
        retweetedBy: req.user._id,
      });

      return res.json({
        message: 'Retweet removed',
        retweets: originalPost.retweets.length,
        isRetweeted: false,
      });
    } else {
      // Retweet - add to retweets array
      originalPost.retweets.push(req.user._id);
      await originalPost.save();

      // Create retweet post
      const retweetPost = new Post({
        user: originalPost.user,
        originalPost: originalPost._id,
        retweetedBy: req.user._id,
        text: originalPost.text || originalPost.caption,
        image: originalPost.image,
        video: originalPost.video,
      });

      await retweetPost.save();
      await retweetPost.populate('user', 'name username profilePicture verified');
      await retweetPost.populate('retweetedBy', 'name username profilePicture verified');
      await retweetPost.populate('originalPost');

      // Create notification for original post owner
      if (originalPost.user.toString() !== req.user._id.toString()) {
        await createNotification(originalPost.user, 'retweet', req.user._id, originalPost._id);
      }

      return res.json({
        message: 'Post retweeted',
        retweets: originalPost.retweets.length,
        isRetweeted: true,
        retweetPost,
      });
    }
  } catch (error) {
    console.error('Retweet error:', error);
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
      // Create notification for post owner
      if (post.user.toString() !== req.user._id.toString()) {
        await createNotification(post.user, 'like', req.user._id, post._id);
      }
    }

    await post.save();

    // Return updated post with populated user info
    await post.populate('user', 'name username profilePicture verified');

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

