const express = require('express');
const {body, validationResult} = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/:id
// @desc    Get user profile
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otp -otpExpiry')
      .populate('followers', 'name username profilePicture')
      .populate('following', 'name username profilePicture');

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  auth,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('bio').optional().isLength({max: 150}).withMessage('Bio too long'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {name, bio, website, phone, profilePicture} = req.body;

      const user = await User.findById(req.user._id);

      if (name) user.name = name;
      if (bio !== undefined) user.bio = bio;
      if (website !== undefined) user.website = website;
      if (phone !== undefined) user.phone = phone;
      if (profilePicture !== undefined) user.profilePicture = profilePicture;

      await user.save();

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
          bio: user.bio,
          website: user.website,
          phone: user.phone,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   POST /api/users/:id/follow
// @desc    Follow/Unfollow a user
// @access  Private
router.post('/:id/follow', auth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user._id);

    if (!targetUser) {
      return res.status(404).json({message: 'User not found'});
    }

    if (targetUser._id.toString() === currentUser._id.toString()) {
      return res.status(400).json({message: 'Cannot follow yourself'});
    }

    const isFollowing = currentUser.following.includes(targetUser._id);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== targetUser._id.toString()
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== currentUser._id.toString()
      );
    } else {
      // Follow
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully',
      isFollowing: !isFollowing,
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   DELETE /api/users/delete-account
// @desc    Delete user account
// @access  Private
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    // Remove user from followers/following lists of other users
    await User.updateMany(
      {followers: user._id},
      {$pull: {followers: user._id}}
    );
    await User.updateMany(
      {following: user._id},
      {$pull: {following: user._id}}
    );

    // Delete the user account
    await User.findByIdAndDelete(req.user._id);

    res.json({message: 'Account deleted successfully'});
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

module.exports = router;

