const express = require('express');
const {body, validationResult} = require('express-validator');
const Story = require('../models/Story');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/stories
// @desc    Create a new story
// @access  Private
router.post(
  '/',
  auth,
  [body('image').notEmpty().withMessage('Image is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {image} = req.body;

      const story = new Story({
        user: req.user._id,
        image,
      });

      await story.save();
      await story.populate('user', 'name username profilePicture');

      res.status(201).json(story);
    } catch (error) {
      console.error('Create story error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   GET /api/stories
// @desc    Get all stories (grouped by user)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    // Get all stories that haven't expired, grouped by user
    const stories = await Story.find({
      expiresAt: {$gt: new Date()},
    })
      .populate('user', 'name username profilePicture')
      .populate('views', 'name username profilePicture')
      .sort({createdAt: -1});

    // Group stories by user
    const groupedStories = {};
    stories.forEach((story) => {
      const userId = story.user._id.toString();
      if (!groupedStories[userId]) {
        groupedStories[userId] = {
          user: story.user,
          stories: [],
        };
      }
      groupedStories[userId].stories.push({
        _id: story._id,
        image: story.image,
        views: story.views,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
      });
    });

    // Convert to array format
    const result = Object.values(groupedStories);

    res.json(result);
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   GET /api/stories/user/:userId
// @desc    Get stories for a specific user
// @access  Private
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const stories = await Story.find({
      user: req.params.userId,
      expiresAt: {$gt: new Date()},
    })
      .populate('user', 'name username profilePicture')
      .populate('views', 'name username profilePicture')
      .sort({createdAt: -1});

    res.json(stories);
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   POST /api/stories/:id/view
// @desc    Mark story as viewed
// @access  Private
router.post('/:id/view', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({message: 'Story not found'});
    }

    // Check if already viewed
    if (!story.views.includes(req.user._id)) {
      story.views.push(req.user._id);
      await story.save();
    }

    res.json({message: 'Story marked as viewed'});
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   DELETE /api/stories/:id
// @desc    Delete a story
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({message: 'Story not found'});
    }

    // Check if user owns the story
    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({message: 'Not authorized'});
    }

    await Story.findByIdAndDelete(req.params.id);

    res.json({message: 'Story deleted successfully'});
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;

