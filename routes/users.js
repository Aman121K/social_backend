const express = require('express');
const {body, validationResult} = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const {createNotification} = require('./notifications');

const router = express.Router();

// @route   GET /api/users
// @desc    List all users (for new message, search, etc.). Excludes current user.
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const {q, limit = 50} = req.query;
    const currentId = req.user._id;
    const filter = {_id: {$ne: currentId}};
    if (q && q.trim()) {
      const search = q.trim();
      filter.$or = [
        {name: {$regex: search, $options: 'i'}},
        {username: {$regex: search, $options: 'i'}},
      ];
    }
    const users = await User.find(filter)
      .select('name username profilePicture verified')
      .limit(Math.min(Number(limit) || 50, 100))
      .sort({name: 1});
    res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   GET /api/users/:id
// @desc    Get user profile
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otp -otpExpiry')
      .populate('followers', 'name username profilePicture verified')
      .populate('following', 'name username profilePicture verified');

    if (!user) {
      return res.status(404).json({message: 'User not found'});
    }

    // Ensure verified field is set and add counts for profile UI
    const userObj = user.toObject();
    userObj.verified = userObj.verified || userObj.isVerified || false;
    userObj.followersCount = (userObj.followers || []).length;
    userObj.followingCount = (userObj.following || []).length;

    res.json(userObj);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   GET /api/users/:id/followers
// @desc    List users who follow this user
// @access  Private
router.get('/:id/followers', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('followers')
      .populate('followers', 'name username profilePicture verified')
      .lean();
    if (!user) return res.status(404).json({message: 'User not found'});
    const list = user.followers || [];
    res.json(list);
  } catch (error) {
    console.error('List followers error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   GET /api/users/:id/following
// @desc    List users this user follows
// @access  Private
router.get('/:id/following', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('following')
      .populate('following', 'name username profilePicture verified')
      .lean();
    if (!user) return res.status(404).json({message: 'User not found'});
    const list = user.following || [];
    res.json(list);
  } catch (error) {
    console.error('List following error:', error);
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
          verified: user.verified || user.isVerified || false,
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   POST /api/users/:id/block
// @desc    Block a user (their posts disappear from your feed; unfollow both ways)
// @access  Private
router.post('/:id/block', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({message: 'User not found'});
    if (targetId.toString() === currentUser._id.toString()) {
      return res.status(400).json({message: 'Cannot block yourself'});
    }
    const tid = targetUser._id;
    const cid = currentUser._id;
    if (!currentUser.blockedUsers) currentUser.blockedUsers = [];
    if (currentUser.blockedUsers.some((id) => id.toString() === tid.toString())) {
      return res.json({message: 'User already blocked'});
    }
    currentUser.blockedUsers.push(tid);
    currentUser.following = (currentUser.following || []).filter((id) => id.toString() !== tid.toString());
    targetUser.followers = (targetUser.followers || []).filter((id) => id.toString() !== cid.toString());
    await currentUser.save();
    await targetUser.save();
    res.json({message: 'User blocked. Their posts will be hidden from your feed.'});
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   DELETE /api/users/:id/block
// @desc    Unblock a user
// @access  Private
router.delete('/:id/block', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const currentUser = await User.findById(req.user._id);
    if (!currentUser.blockedUsers) return res.json({message: 'User not blocked'});
    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      (id) => id.toString() !== targetId.toString()
    );
    await currentUser.save();
    res.json({message: 'User unblocked'});
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

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

    const isFollowing = currentUser.following.some((id) => id.toString() === targetUser._id.toString());

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
      // Create notification for followed user
      await createNotification(targetUser._id, 'follow', currentUser._id);
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

// @route   PUT /api/users/email
// @desc    Update user email
// @access  Private
router.put(
  '/email',
  auth,
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {email, password} = req.body;
      const user = await User.findById(req.user._id);

      // Verify password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({message: 'Invalid password'});
      }

      // Check if email already exists
      const existingUser = await User.findOne({email: email.toLowerCase()});
      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({message: 'Email already in use'});
      }

      user.email = email.toLowerCase();
      await user.save();

      res.json({
        message: 'Email updated successfully',
        email: user.email,
      });
    } catch (error) {
      console.error('Update email error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   PUT /api/users/password
// @desc    Update user password
// @access  Private
router.put(
  '/password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({min: 6})
      .withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {currentPassword, newPassword} = req.body;
      const user = await User.findById(req.user._id);

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({message: 'Current password is incorrect'});
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({message: 'Password updated successfully'});
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   POST /api/users/apply-verification
// @desc    Apply for verified account
// @access  Private
router.post(
  '/apply-verification',
  auth,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {name, email, reason} = req.body;
      const user = await User.findById(req.user._id);

      // Check if already verified
      if (user.verified || user.isVerified) {
        return res.status(400).json({message: 'Account is already verified'});
      }

      // Check if already applied
      if (user.verificationApplication && user.verificationApplication.status === 'pending') {
        return res.status(400).json({message: 'Verification application already pending'});
      }

      // Create verification application
      user.verificationApplication = {
        status: 'pending',
        appliedAt: new Date(),
        reason: reason,
      };

      await user.save();

      res.json({
        message: 'Verification application submitted successfully',
        status: 'pending',
      });
    } catch (error) {
      console.error('Apply verification error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

module.exports = router;

