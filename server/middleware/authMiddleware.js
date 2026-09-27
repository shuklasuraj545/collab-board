const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * authMiddleware — verifies the JWT from the HTTP-only cookie named `accessToken`.
 * On success, attaches `req.user` (full user doc without password) and calls next().
 * On failure, returns 401 with spec-compliant error shape.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user so stale/deleted accounts are caught
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
  }
};

module.exports = authMiddleware;
