import { useEffect, useState } from 'react';
import { socket } from '../socket/socketClient';
import { useBoardStore } from '../store/boardStore';

export const useSocket = (boardId) => {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const {
    moveTaskOptimistic,
    rollback,
    addTask,
    removeTask,
    updateTaskState,
    addCommentState,
    board,
  } = useBoardStore();

  useEffect(() => {
    if (!boardId) return;

    // Connect socket if disconnected
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      setIsConnected(true);
      socket.emit('board:join', { boardId });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    // If socket is already connected when boardId changes
    if (socket.connected) {
      setIsConnected(true);
      socket.emit('board:join', { boardId });
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // --- Real-time Socket Event Handlers ---

    // Broadcast from server when another user moves a task
    const onTaskMoved = (data) => {
      const { taskId, sourceListId, destListId, newIndex } = data;
      // Apply move to Zustand store without triggering rollback snapshot again
      useBoardStore.getState().moveTaskOptimistic(taskId, sourceListId, destListId, newIndex);
    };

    // Rollback or rejection when server rejects a task move (e.g. stale version)
    const onTaskMoveRejected = (data) => {
      console.warn('Task move rejected by server (version mismatch):', data);
      const { authoritativeTask } = data;
      if (authoritativeTask) {
        // If server provided full authoritative task, update it
        useBoardStore.getState().updateTaskState(authoritativeTask._id, authoritativeTask);
      } else {
        // Otherwise rollback to previous local snapshot
        rollback();
      }
    };

    const onTaskCreated = (newTask) => {
      addTask(newTask);
    };

    const onTaskUpdated = (data) => {
      const { taskId, changes } = data;
      updateTaskState(taskId, changes);
    };

    const onTaskDeleted = (data) => {
      const { taskId, listId } = data;
      removeTask(taskId, listId);
    };

    const onCommentAdded = (data) => {
      const { taskId, comment } = data;
      addCommentState(taskId, comment);
    };

    socket.on('task:moved', onTaskMoved);
    socket.on('task:move:rejected', onTaskMoveRejected);
    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('comment:added', onCommentAdded);

    return () => {
      socket.emit('board:leave', { boardId });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('task:moved', onTaskMoved);
      socket.off('task:move:rejected', onTaskMoveRejected);
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('comment:added', onCommentAdded);
    };
  }, [boardId]);

  return { socket, isConnected };
};
