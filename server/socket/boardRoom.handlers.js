const User = require('../models/User');
const Board = require('../models/Board');

/**
 * Handles board room join/leave events per spec Section 5.1.
 *
 * board:join  { boardId } → verifies user is a board member in DB; joins room socket.join(boardId);
 *                           replies with board:members (current online users)
 * board:leave { boardId } → socket.leave(boardId); broadcasts presence:user_left to room
 */
const registerBoardRoomHandlers = (io, socket) => {
  socket.on('board:join', async ({ boardId }) => {
    if (!boardId) return;

    try {
      // 1. Check board membership in MongoDB before allowing room join
      const board = await Board.findById(boardId);
      if (!board || board.isArchived) {
        return socket.emit('error', { error: 'Board not found', code: 'BOARD_NOT_FOUND' });
      }

      const userId = socket.userId;
      if (!userId) {
        return socket.emit('error', { error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
      }

      const isMember =
        board.members.some((m) => m.toString() === userId) ||
        (board.createdBy && board.createdBy.toString() === userId);

      if (!isMember) {
        return socket.emit('error', { error: 'Not a member of this board', code: 'FORBIDDEN' });
      }

      // 2. Join the socket room after membership validation
      socket.join(boardId);
      console.log(`Socket ${socket.id} (user: ${userId}) joined board room: ${boardId}`);

      // 3. Fetch user info to broadcast presence
      const user = await User.findById(userId).select('name email avatar');
      if (!user) return;

      // Reply to the joiner with current online members in this room
      const socketsInRoom = await io.in(boardId).fetchSockets();
      const onlineUserIds = [...new Set(socketsInRoom.map((s) => s.userId).filter(Boolean))];

      const onlineUsers = await User.find({ _id: { $in: onlineUserIds } }).select(
        'name email avatar'
      );

      // Tell only the joining socket who's already in the room
      socket.emit('board:members', { members: onlineUsers });

      // Tell everyone else in the room that this user joined
      socket.to(boardId).emit('presence:user_active', {
        userId: user._id,
        name: user.name,
        avatar: user.avatar,
      });
    } catch (err) {
      console.error('board:join error:', err);
      socket.emit('error', { error: 'Failed to join board room', code: 'SERVER_ERROR' });
    }
  });

  socket.on('board:leave', ({ boardId }) => {
    if (!boardId) return;

    socket.leave(boardId);
    console.log(`Socket ${socket.id} left board room: ${boardId}`);

    // Broadcast to remaining room members that this user left
    socket.to(boardId).emit('presence:user_left', { userId: socket.userId });
  });
};

module.exports = registerBoardRoomHandlers;
