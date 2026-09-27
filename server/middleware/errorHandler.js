/**
 * Centralized error handler — must be registered LAST in Express middleware chain.
 * Returns spec-compliant JSON error shape: { error: "...", code: "..." }
 */
const errorHandler = (err, req, res, next) => {
  console.error('[ErrorHandler]', err);

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message).join('; ');
    return res.status(400).json({ error: messages, code: 'VALIDATION_ERROR' });
  }

  // Mongoose duplicate key (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: `${field} already in use`,
      code: 'DUPLICATE_KEY',
    });
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(404).json({ error: 'Resource not found', code: 'NOT_FOUND' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
  }

  // Default 500
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Server error',
    code: err.code || 'SERVER_ERROR',
  });
};

module.exports = errorHandler;
