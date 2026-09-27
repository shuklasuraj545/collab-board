require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const registerSocketHandlers = require('./socket');

// Route imports
const authRoutes = require('./routes/auth.routes');
const workspaceRoutes = require('./routes/workspace.routes');
const boardRoutes = require('./routes/board.routes');
const listRoutes = require('./routes/list.routes');
const taskRoutes = require('./routes/task.routes');
const invitationRoutes = require('./routes/invitation.routes');

// ─── Express App Setup ───────────────────────────────────────────────────────
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true, // Required for HTTP-only cookies to be sent cross-origin
  })
);
app.use(express.json());
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invitations', invitationRoutes);

// Health check — used to verify Slice 0 deliverable
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handler — must be LAST middleware registered
app.use(errorHandler);

// ─── HTTP Server (shared with Socket.io per spec Section 1.1) ─────────────────
const httpServer = http.createServer(app);

// ─── Socket.io Server ────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  allowRequest: (req, callback) => {
    callback(null, true);
  },
});

// Make io available to Express controllers via req.app.get('io')
app.set('io', io);

// Register all socket event handlers
registerSocketHandlers(io);

// ─── Bootstrap ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const bootstrap = async () => {
  // Connect to MongoDB first
  await connectDB();

  // Attempt Redis connection for Slice 4 (graceful fallback if Redis is down in dev)
  try {
    const { initRedis } = require('./config/redis');
    const redisAdapter = await initRedis();
    if (redisAdapter) {
      io.adapter(redisAdapter);
      console.log('Socket.io Redis adapter active');
    }
  } catch (err) {
    console.warn('Socket.io running without Redis adapter (single-instance mode).');
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (http://localhost:${PORT})`);
  });
};

bootstrap();
