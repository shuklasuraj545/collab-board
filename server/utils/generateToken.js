const jwt = require('jsonwebtoken');

/**
 * generateToken — creates a signed JWT containing the user's _id.
 * Sets the token as an HTTP-only cookie on the response.
 *
 * @param {object} res  - Express response object
 * @param {string} userId - MongoDB ObjectId as string
 */
const generateToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', token, {
    httpOnly: true,                        // not accessible via JS — XSS protection
    secure: isProduction,                  // HTTPS only in prod (required if sameSite is 'none')
    // Dev uses 'lax' for local development.
    // NOTE FOR PRODUCTION: For cross-domain production deployments (e.g. client on Vercel, server on Render/Fly.io),
    // sameSite MUST be set to 'none' with secure: true so browsers transmit cookies across third-party contexts.
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,       // 7 days in ms — matches JWT_EXPIRES_IN
  });

  return token;
};

module.exports = generateToken;
