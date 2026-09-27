/**
 * Handles cursor presence events per spec Section 5.2.
 *
 * presence:mouse_move — throttled client-side (~50ms), server re-broadcasts as presence:cursor_update
 *   Payload: { boardId, x, y, userId }
 *   Server uses socket.to(boardId) — excludes the sender (they know their own cursor)
 *   Not persisted to DB. No ack required.
 *
 * Note: The client throttles to ~50ms (20 events/sec). Server does NOT add additional
 * throttle — if we did, we'd need to store per-socket timestamps which would add
 * unnecessary server state. Trust the client throttle per the spec design.
 */
const registerPresenceHandlers = (io, socket) => {
  socket.on('presence:mouse_move', (payload) => {
    const { boardId, x, y, userId } = payload;
    if (!boardId) return;

    // Re-broadcast to everyone in the room EXCEPT the sender
    // Uses socket.to() not io.to() per spec Section 5.2
    socket.to(boardId).emit('presence:cursor_update', {
      boardId,
      x,
      y,
      userId: userId || socket.userId,
    });
  });
};

module.exports = registerPresenceHandlers;
