const registerBoardRoomHandlers = require('./boardRoom.handlers');
const registerTaskHandlers = require('./task.handlers');
const registerPresenceHandlers = require('./presence.handlers');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

/**
 * Registers all Socket.io namespaces, connection authentication middleware, and event handlers.
 * Called from index.js after io is created.
 *
 * @param {import('socket.io').Server} io
 */
const registerSocketHandlers = (io) => {
  io.use((socket, next) => {
    try {
      const rawCookies = socket.handshake.headers.cookie || '';
      const cookies = cookie.parse(rawCookies);
      const token = cookies.accessToken;

      if (!token) {
        return next(new Error('Not authenticated'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id; // attach userId to socket for use in handlers
      next();
    } catch (err) {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Auto-join personal user room for real-time notifications (e.g. io.to('user:<id>'))
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    registerBoardRoomHandlers(io, socket);
    registerTaskHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} — reason: ${reason}`);
    });
  });
};

module.exports = registerSocketHandlers;
