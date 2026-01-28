const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({message: 'No token, authorization denied'});
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_jwt_key');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({message: 'Token is not valid'});
    }

    if (!user.isVerified) {
      return res.status(401).json({message: 'Please verify your email first'});
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({message: 'Token is not valid'});
  }
};

module.exports = auth;

