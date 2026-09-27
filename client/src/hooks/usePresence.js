import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket/socketClient';
import { useAuth } from './useAuth';

// Helper to assign a random consistent avatar/cursor color per user
const CURSOR_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

const getColorForUser = (userId) => {
  if (!userId) return CURSOR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
};

export const usePresence = (boardId) => {
  const { user } = useAuth();
  const [remoteCursors, setRemoteCursors] = useState({});
  const lastEmitTime = useRef(0);

  useEffect(() => {
    if (!boardId || !user) return;

    // Track local mouse movement and throttle to ~50ms (20 events/sec) per spec 5.2 & 7.3
    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastEmitTime.current > 50) {
        lastEmitTime.current = now;

        if (socket && socket.connected) {
          socket.emit('presence:mouse_move', {
            boardId,
            x: e.clientX,
            y: e.clientY,
            userId: user.id || user._id,
            name: user.name,
            color: getColorForUser(user.id || user._id),
          });
        }
      }
    };

    // Listen for remote cursor updates from other users
    const onCursorUpdate = (data) => {
      const { userId, x, y, name } = data;
      // Don't render cursor for self
      if (userId === (user.id || user._id)) return;

      setRemoteCursors((prev) => ({
        ...prev,
        [userId]: {
          x,
          y,
          name: name || 'Collaborator',
          color: getColorForUser(userId),
          lastUpdated: Date.now(),
        },
      }));
    };

    // Listen for user leaving board to clear cursor
    const onUserLeft = (data) => {
      const { userId } = data;
      setRemoteCursors((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    socket.on('presence:cursor_update', onCursorUpdate);
    socket.on('presence:user_left', onUserLeft);

    // Clean up inactive cursors after 5 seconds of no updates
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        let changed = false;
        const next = {};
        for (const [id, cursor] of Object.entries(prev)) {
          if (now - cursor.lastUpdated < 5000) {
            next[id] = cursor;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      socket.off('presence:cursor_update', onCursorUpdate);
      socket.off('presence:user_left', onUserLeft);
      clearInterval(cleanupInterval);
    };
  }, [boardId, user]);

  return { remoteCursors };
};
