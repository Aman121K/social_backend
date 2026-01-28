const express = require('express');
const jwt = require('jsonwebtoken');
const {body, validationResult} = require('express-validator');
const User = require('../models/User');
const {sendOTP} = require('../utils/emailService');
const auth = require('../middleware/auth');

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({userId}, process.env.JWT_SECRET || 'your_super_secret_jwt_key', {
    expiresIn: '30d',
  });
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post(
  '/signup',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({min: 3})
      .withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password')
      .isLength({min: 6})
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {name, username, email, password} = req.body;

      // Check if user already exists
      let user = await User.findOne({
        $or: [{email}, {username: username.toLowerCase()}],
      });

      if (user) {
        return res.status(400).json({
          message: 'User already exists with this email or username',
        });
      }

      // Generate OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create user
      user = new User({
        name,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password,
        otp,
        otpExpiry,
      });

      await user.save();

      // Send OTP email
      const emailSent = await sendOTP(email, otp);
      if (!emailSent) {
        return res.status(500).json({message: 'Failed to send OTP email'});
      }

      res.status(201).json({
        message: 'User registered successfully. Please verify your email with OTP.',
        userId: user._id,
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   POST /api/auth/verify-otp
// @desc    Verify OTP and activate account
// @access  Public
router.post(
  '/verify-otp',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('otp').isLength({min: 6, max: 6}).withMessage('OTP must be 6 digits'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {email, otp} = req.body;

      const user = await User.findOne({email: email.toLowerCase()});

      if (!user) {
        return res.status(404).json({message: 'User not found'});
      }

      if (user.isVerified) {
        return res.status(400).json({message: 'Email already verified'});
      }

      if (user.otp !== otp) {
        return res.status(400).json({message: 'Invalid OTP'});
      }

      if (new Date() > user.otpExpiry) {
        return res.status(400).json({message: 'OTP has expired'});
      }

      // Verify user
      user.isVerified = true;
      user.otp = null;
      user.otpExpiry = null;
      await user.save();

      const token = generateToken(user._id);

      res.json({
        message: 'Email verified successfully',
        token,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
        },
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   POST /api/auth/signin
// @desc    Login user
// @access  Public
router.post(
  '/signin',
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

      const user = await User.findOne({email: email.toLowerCase()});

      if (!user) {
        return res.status(400).json({message: 'Invalid credentials'});
      }

      if (!user.isVerified) {
        return res.status(400).json({
          message: 'Please verify your email first',
        });
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(400).json({message: 'Invalid credentials'});
      }

      const token = generateToken(user._id);

      res.json({
        message: 'Login successful',
        token,
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
      console.error('Signin error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP
// @access  Public
router.post(
  '/resend-otp',
  [body('email').isEmail().withMessage('Please enter a valid email')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {email} = req.body;

      const user = await User.findOne({email: email.toLowerCase()});

      if (!user) {
        return res.status(404).json({message: 'User not found'});
      }

      if (user.isVerified) {
        return res.status(400).json({message: 'Email already verified'});
      }

      // Generate new OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      // Send OTP email
      const emailSent = await sendOTP(email, otp);
      if (!emailSent) {
        return res.status(500).json({message: 'Failed to send OTP email'});
      }

      res.json({message: 'OTP sent successfully'});
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({message: 'Server error'});
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client should remove token)
// @access  Private
router.post('/logout', auth, (req, res) => {
  res.json({message: 'Logged out successfully'});
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset OTP
// @access  Public
router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Please enter a valid email')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {email} = req.body;

      // Find user by email or username
      const user = await User.findOne({
        $or: [
          {email: email.toLowerCase()},
          {username: email.toLowerCase()},
        ],
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json({
          message: 'If an account exists with this email, a password reset link has been sent.',
        });
      }

      // Generate OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Save OTP to user
      user.otp = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      // Send OTP email
      const emailSent = await sendOTP(user.email, otp, 'Password Reset');
      if (!emailSent) {
        return res.status(500).json({message: 'Failed to send reset email'});
      }

      res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

// @route   POST /api/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post(
  '/reset-password',
  [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('otp').isLength({min: 6, max: 6}).withMessage('OTP must be 6 digits'),
    body('newPassword')
      .isLength({min: 6})
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array()});
      }

      const {email, otp, newPassword} = req.body;

      // Find user
      const user = await User.findOne({
        $or: [
          {email: email.toLowerCase()},
          {username: email.toLowerCase()},
        ],
      });

      if (!user) {
        return res.status(404).json({message: 'User not found'});
      }

      // Verify OTP
      if (user.otp !== otp) {
        return res.status(400).json({message: 'Invalid OTP'});
      }

      // Check if OTP is expired
      if (new Date() > user.otpExpiry) {
        return res.status(400).json({message: 'OTP has expired. Please request a new one.'});
      }

      // Update password
      user.password = newPassword;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      res.json({message: 'Password reset successfully'});
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({message: 'Server error'});
    }
  }
);

module.exports = router;

