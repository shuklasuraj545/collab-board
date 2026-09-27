import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import ListColumn from './ListColumn';
import TaskCard from './TaskCard';
import { Plus, X } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { useBoardDragAndDrop } from '../../hooks/useBoardDragAndDrop';
import axiosInstance from '../../api/axiosInstance';

export const BoardCanvas = ({ boardId }) => {
  const { board, addList } = useBoardStore();
  const { handleDragStart, handleDragEnd, activeTask } = useBoardDragAndDrop(boardId);

  const [isAddingList, setIsAddingList] = useState(false);
  const [listTitle, setListTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required to trigger drag (prevents accidental clicks)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!listTitle.trim() || loading || !board) return;

    const title = listTitle.trim();
    setListTitle('');
    setIsAddingList(false);

    const position = (board.lists.length + 1) * 1000;

    try {
      setLoading(true);
      const res = await axiosInstance.post('/lists', {
        title,
        boardId: board._id,
        position,
      });

      addList(res.data.list);
    } catch (err) {
      console.error('Failed to create list:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!board) return null;

  return (
    <div className="flex-1 overflow-x-auto custom-scrollbar p-6 bg-slate-900/10">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-start space-x-4 h-full min-w-max pb-4">
          {/* Render List Columns */}
          {board.lists &&
            board.lists.map((list) => (
              <ListColumn key={list._id} list={list} boardId={board._id} />
            ))}

          {/* Add List Column */}
          <div className="w-72 flex-shrink-0">
            {isAddingList ? (
              <form onSubmit={handleCreateList} className="bg-gray-100 p-3 rounded-xl border border-gray-300 shadow-md space-y-3">
                <input
                  type="text"
                  autoFocus
                  required
                  value={listTitle}
                  onChange={(e) => setListTitle(e.target.value)}
                  placeholder="Enter list title..."
                  className="w-full text-sm outline-none px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 bg-white"
                />
                <div className="flex items-center space-x-2">
                  <button
                    type="submit"
                    className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium px-3 py-2 rounded-lg shadow transition"
                  >
                    Add List
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingList(false)}
                    className="text-gray-500 hover:text-gray-700 p-1.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingList(true)}
                className="w-full flex items-center space-x-2 text-sm text-gray-700 font-semibold bg-white/60 hover:bg-white/90 border border-dashed border-gray-300 p-3 rounded-xl transition shadow-sm"
              >
                <Plus className="w-4 h-4 text-gray-600" />
                <span>Add another list</span>
              </button>
            )}
          </div>
        </div>

        {/* Drag Overlay during active drag */}
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default BoardCanvas;
