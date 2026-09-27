import { create } from 'zustand';

export const useBoardStore = create((set, get) => ({
  board: null,
  isLoading: false,
  error: null,
  activeTask: null,
  previousSnapshot: null,

  setBoard: (board) => set({ board, isLoading: false, error: null }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  setActiveTask: (activeTask) => set({ activeTask }),

  // Snapshot current state for rollback upon optimistic write failure
  takeSnapshot: () => {
    const { board } = get();
    if (!board) return;
    set({ previousSnapshot: JSON.parse(JSON.stringify(board)) });
  },

  // Restore state to previous snapshot upon server error or version rejection
  rollback: () => {
    const { previousSnapshot } = get();
    if (previousSnapshot) {
      set({ board: previousSnapshot, previousSnapshot: null });
    }
  },

  // Optimistic move task within same list or between lists
  moveTaskOptimistic: (taskId, sourceListId, destListId, newIndex) => {
    const { board, takeSnapshot } = get();
    if (!board) return;

    takeSnapshot();

    const lists = board.lists.map((l) => ({ ...l, tasks: [...l.tasks] }));
    const sourceList = lists.find((l) => l._id === sourceListId);
    const destList = lists.find((l) => l._id === destListId);

    if (!sourceList || !destList) return;

    const taskIndex = sourceList.tasks.findIndex((t) => (t._id || t) === taskId || t === taskId);
    if (taskIndex === -1) return;

    const [movedTask] = sourceList.tasks.splice(taskIndex, 1);
    const updatedTask = typeof movedTask === 'object' ? { ...movedTask, list: destListId } : movedTask;

    destList.tasks.splice(newIndex, 0, updatedTask);

    set({
      board: {
        ...board,
        lists,
      },
    });
  },

  addList: (newList) => {
    const { board } = get();
    if (!board) return;

    const exists = board.lists.some((l) => l._id === newList._id);
    if (exists) return;

    set({
      board: {
        ...board,
        lists: [...board.lists, { ...newList, tasks: newList.tasks || [] }],
      },
    });
  },

  addBoardMember: (newMember) => {
    const { board } = get();
    if (!board) return;
    const members = board.members ? [...board.members] : [];
    const exists = members.some((m) => (m._id || m) === (newMember._id || newMember));
    if (!exists) {
      members.push(newMember);
    }
    set({ board: { ...board, members } });
  },

  removeBoardMember: (memberId) => {
    const { board } = get();
    if (!board) return;
    const members = (board.members || []).filter(
      (m) => (m._id || m).toString() !== memberId.toString()
    );
    set({ board: { ...board, members } });
  },

  // Add task with global deduplication and optimistic temp-card replacement
  addTask: (newTask) => {
    const { board } = get();
    if (!board) return;

    for (const list of board.lists) {
      if (list.tasks.some((t) => t._id === newTask._id)) {
        return;
      }
    }

    const lists = board.lists.map((l) => {
      if (l._id === newTask.list) {
        const tempIndex = l.tasks.findIndex(
          (t) =>
            typeof t._id === 'string' &&
            t._id.startsWith('temp-') &&
            t.title === newTask.title
        );

        if (tempIndex !== -1) {
          const updatedTasks = [...l.tasks];
          updatedTasks[tempIndex] = newTask;
          return { ...l, tasks: updatedTasks };
        }

        return { ...l, tasks: [...l.tasks, newTask] };
      }
      return l;
    });

    set({ board: { ...board, lists } });
  },

  // Swap temporary task ID with authoritative server response ID
  swapTempTaskId: (tempId, realTask) => {
    const { board } = get();
    if (!board) return;

    const lists = board.lists.map((l) => {
      if (l._id === realTask.list) {
        const realExists = l.tasks.some((t) => t._id === realTask._id);

        if (realExists) {
          return { ...l, tasks: l.tasks.filter((t) => t._id !== tempId) };
        }

        const tasks = l.tasks.map((t) => (t._id === tempId ? realTask : t));
        return { ...l, tasks };
      }
      return l;
    });

    set({ board: { ...board, lists } });
  },

  removeTask: (taskId, listId) => {
    const { board } = get();
    if (!board) return;
    const lists = board.lists.map((l) => {
      if (l._id === listId || !listId) {
        return { ...l, tasks: l.tasks.filter((t) => t._id !== taskId) };
      }
      return l;
    });
    set({ board: { ...board, lists } });
  },

  updateTaskState: (taskId, updatedFields) => {
    const { board, activeTask } = get();
    if (!board) return;
    const lists = board.lists.map((l) => ({
      ...l,
      tasks: l.tasks.map((t) => (t._id === taskId ? { ...t, ...updatedFields } : t)),
    }));

    let newActiveTask = activeTask;
    if (activeTask && activeTask._id === taskId) {
      newActiveTask = { ...activeTask, ...updatedFields };
    }

    set({ board: { ...board, lists }, activeTask: newActiveTask });
  },

  addCommentState: (taskId, comment) => {
    const { board, activeTask } = get();
    if (!board) return;
    const lists = board.lists.map((l) => ({
      ...l,
      tasks: l.tasks.map((t) => {
        if (t._id === taskId) {
          const comments = t.comments ? [...t.comments] : [];
          const commentExists = comments.some((c) => c._id === comment._id);
          if (!commentExists) {
            comments.push(comment);
          }
          return { ...t, comments };
        }
        return t;
      }),
    }));

    let newActiveTask = activeTask;
    if (activeTask && activeTask._id === taskId) {
      const comments = activeTask.comments ? [...activeTask.comments] : [];
      const commentExists = comments.some((c) => c._id === comment._id);
      if (!commentExists) {
        comments.push(comment);
      }
      newActiveTask = { ...activeTask, comments };
    }

    set({ board: { ...board, lists }, activeTask: newActiveTask });
  },
}));
