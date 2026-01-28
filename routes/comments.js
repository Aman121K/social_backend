const express = require('express');
const {body, validationResult} = require('express-validator');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/comments
// @desc    Add a comment to a post
// @access  Private
router.post(
  '/',
  auth,
  [
    body('postId').notEmpty().withMessage('Post ID is required'),
    body('text').trim().notEmpty().withMessage('Comment text is required').isLength({max: 500}).withMessage('Comment too long'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {postId, text} = req.body;

      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({message: 'Post not found'});
      }

      const comment = new Comment({
        post: postId,
        user: req.user._id,
        text,
      });

      await comment.save();
      await comment.populate('user', 'name username profilePicture');

      // Add comment to post
      post.comments.push(comment._id);
      await post.save();

      res.status(201).json(comment);
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   GET /api/comments/post/:postId
// @desc    Get all comments for a post
// @access  Private
router.get('/post/:postId', auth, async (req, res) => {
  try {
    const comments = await Comment.find({post: req.params.postId})
      .populate('user', 'name username profilePicture')
      .populate('likes', 'name username profilePicture')
      .sort({createdAt: -1});

    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   POST /api/comments/:id/like
// @desc    Like/Unlike a comment
// @access  Private
router.post('/:id/like', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({message: 'Comment not found'});
    }

    const isLiked = comment.likes.includes(req.user._id);

    if (isLiked) {
      comment.likes = comment.likes.filter(
        (id) => id.toString() !== req.user._id.toString()
      );
    } else {
      comment.likes.push(req.user._id);
    }

    await comment.save();

    res.json({
      message: isLiked ? 'Comment unliked' : 'Comment liked',
      likes: comment.likes.length,
      isLiked: !isLiked,
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({message: 'Comment not found'});
    }

    // Check if user owns the comment
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({message: 'Not authorized'});
    }

    // Remove comment from post
    await Post.findByIdAndUpdate(comment.post, {
      $pull: {comments: comment._id},
    });

    await Comment.findByIdAndDelete(req.params.id);

    res.json({message: 'Comment deleted successfully'});
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;

