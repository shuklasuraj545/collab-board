import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import { Plus, X } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { useBoardStore } from '../../store/boardStore';

export const ListColumn = ({ list, boardId }) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const { addTask, swapTempTaskId } = useBoardStore();

  const { setNodeRef } = useDroppable({
    id: list._id,
  });

  const taskIds = list.tasks.map((t) => t._id);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || loading) return;

    const title = taskTitle.trim();
    setTaskTitle('');
    setIsAddingTask(false);

    // Optimistic temporary task insertion per Section 1.2 of spec
    const tempId = `temp-${Date.now()}`;
    const position = (list.tasks.length + 1) * 1000;

    const tempTask = {
      _id: tempId,
      title,
      list: list._id,
      board: boardId,
      position,
      priority: 'medium',
      comments: [],
      assignees: [],
    };

    addTask(tempTask);

    try {
      setLoading(true);
      const res = await axiosInstance.post('/tasks', {
        title,
        listId: list._id,
        boardId,
        position,
      });

      // Swap temp task with real task from server
      swapTempTaskId(tempId, res.data.task);
    } catch (err) {
      console.error('Failed to create task:', err);
      // Remove temp task on failure (rollback)
      useBoardStore.getState().removeTask(tempId, list._id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-100/80 rounded-xl p-3 w-72 flex-shrink-0 flex flex-col max-h-full border border-gray-200/60 shadow-sm"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1">
        <h3 className="font-semibold text-gray-800 text-sm">{list.title}</h3>
        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
          {list.tasks.length}
        </span>
      </div>

      {/* Task Cards Container (Droppable + Sortable) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 min-h-[50px] pr-1">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {list.tasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))}
        </SortableContext>
      </div>

      {/* Add Task Footer */}
      <div className="pt-3">
        {isAddingTask ? (
          <form onSubmit={handleAddTask} className="bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm space-y-2">
            <input
              type="text"
              autoFocus
              required
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full text-sm outline-none px-1 py-0.5 text-gray-800"
            />
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="submit"
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded shadow transition"
              >
                Add Task
              </button>
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setIsAddingTask(true)}
            className="w-full flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 p-2 rounded-lg transition font-medium text-left"
          >
            <Plus className="w-4 h-4" />
            <span>Add a task</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ListColumn;
