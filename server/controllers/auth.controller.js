const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * @desc  Register a new user
 * @route POST /api/auth/register
 * @access Public
 * Response 201: { user: { id, name, email, avatar }, message: "Registered successfully" }
 * Response 400: { error: "Email already in use" }
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use', code: 'DUPLICATE_KEY' });
    }

    const user = await User.create({ name, email, password });
    generateToken(res, user._id.toString());

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
      message: 'Registered successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Login user
 * @route POST /api/auth/login
 * @access Public
 * Response 200: { user: { id, name, email, avatar } }
 * Response 401: { error: "Invalid credentials" }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Must use +password to override select: false
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    }

    // Update lastSeen on login
    user.lastSeen = new Date();
    await user.save();

    generateToken(res, user._id.toString());

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Logout user — clears the accessToken cookie
 * @route POST /api/auth/logout
 * @access Public
 * Response 200: { message: "Logged out" }
 */
const logout = (req, res) => {
  res.cookie('accessToken', '', {
    httpOnly: true,
    expires: new Date(0), // immediately expire
  });
  res.status(200).json({ message: 'Logged out' });
};

/**
 * @desc  Get current authenticated user
 * @route GET /api/auth/me
 * @access Private (authMiddleware)
 * Response 200: { user: { ...userDoc } }
 * Response 401: handled by authMiddleware
 */
const getMe = (req, res) => {
  res.status(200).json({ user: req.user });
};

module.exports = { register, login, logout, getMe };
