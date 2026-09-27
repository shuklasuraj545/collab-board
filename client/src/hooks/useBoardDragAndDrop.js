import { useState } from 'react';
import { useBoardStore } from '../store/boardStore';
import { socket } from '../socket/socketClient';

export const useBoardDragAndDrop = (boardId) => {
  const [activeTask, setActiveTask] = useState(null);
  const { board, moveTaskOptimistic } = useBoardStore();

  const handleDragStart = (event) => {
    const { active } = event;
    const taskId = active.id;

    // Find active task object across all lists
    if (board && board.lists) {
      for (const list of board.lists) {
        const found = list.tasks.find((t) => t._id === taskId);
        if (found) {
          setActiveTask(found);
          break;
        }
      }
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !board) return;

    const taskId = active.id;
    const overId = over.id;

    // Determine source list and destination list
    let sourceListId = null;
    let destListId = null;
    let newIndex = 0;

    // Search for source list containing task
    for (const list of board.lists) {
      if (list.tasks.some((t) => t._id === taskId)) {
        sourceListId = list._id;
        break;
      }
    }

    if (!sourceListId) return;

    // Determine destination: overId could be a List ID or another Task ID
    const isOverList = board.lists.some((l) => l._id === overId);

    if (isOverList) {
      destListId = overId;
      const destList = board.lists.find((l) => l._id === destListId);
      newIndex = destList ? destList.tasks.length : 0;
    } else {
      // overId is another task
      for (const list of board.lists) {
        const foundIdx = list.tasks.findIndex((t) => t._id === overId);
        if (foundIdx !== -1) {
          destListId = list._id;
          newIndex = foundIdx;
          break;
        }
      }
    }

    if (!destListId) return;

    // Find target task's version for optimistic lock check
    let clientVersion = 0;
    for (const list of board.lists) {
      const t = list.tasks.find((t) => t._id === taskId);
      if (t) {
        clientVersion = t.__v || 0;
        break;
      }
    }

    // Apply optimistic move locally in Zustand store
    moveTaskOptimistic(taskId, sourceListId, destListId, newIndex);

    // Emit real-time event if socket is connected
    if (socket && socket.connected) {
      socket.emit('task:moved', {
        taskId,
        sourceListId,
        destListId,
        newIndex,
        boardId,
        clientVersion,
      });
    }
  };

  return {
    handleDragStart,
    handleDragEnd,
    activeTask,
    isDragging: !!activeTask,
  };
};
