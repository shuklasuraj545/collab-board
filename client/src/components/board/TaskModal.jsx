import React, { useState, useEffect } from 'react';
import { useBoardStore } from '../../store/boardStore';
import Avatar from '../common/Avatar';
import { X, Trash2, Calendar, Flag, MessageSquare, Send } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

// Safe date formatter helper to prevent RangeError: Invalid time value
const safeFormatDate = (dateVal) => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
};

const TaskModalContent = ({ task }) => {
  const { setActiveTask, updateTaskState, removeTask, addCommentState } = useBoardStore();

  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'medium');
  const [dueDate, setDueDate] = useState(safeFormatDate(task.dueDate));
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Synchronize internal form state when task prop changes
  useEffect(() => {
    setTitle(task.title || '');
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    setDueDate(safeFormatDate(task.dueDate));
  }, [task._id, task.title, task.description, task.priority, task.dueDate]);

  const handleUpdate = async (fields) => {
    try {
      updateTaskState(task._id, fields);
      await axiosInstance.patch(`/tasks/${task._id}`, fields);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDelete = async () => {
    try {
      removeTask(task._id, task.list);
      setActiveTask(null);
      await axiosInstance.delete(`/tasks/${task._id}`);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    const text = commentText.trim();
    setCommentText('');
    setIsSubmittingComment(true);

    try {
      const res = await axiosInstance.post(`/tasks/${task._id}/comments`, { text });
      addCommentState(task._id, res.data.comment);
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        // Close modal when clicking dark backdrop
        if (e.target === e.currentTarget) setActiveTask(null);
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
          <div className="flex-1 pr-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleUpdate({ title })}
              className="text-xl font-bold text-gray-900 w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-brand-500 focus:bg-white px-1 py-0.5 outline-none transition rounded"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete Task"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTask(null)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* Metadata Controls */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
            {/* Priority */}
            <div>
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                <Flag className="w-3.5 h-3.5 text-gray-400" />
                <span>Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  handleUpdate({ priority: e.target.value });
                }}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-gray-600 mb-1.5 uppercase">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>Due Date</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  handleUpdate({ dueDate: e.target.value ? new Date(e.target.value).toISOString() : null });
                }}
                className="w-full bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Description</h4>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleUpdate({ description })}
              placeholder="Add a more detailed description..."
              className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition"
            />
          </div>

          {/* Comments Section */}
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <span>Comments ({task.comments?.length || 0})</span>
            </h4>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="flex space-x-2 mb-6">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmittingComment}
                className="bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-1 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {task.comments && task.comments.length > 0 ? (
                task.comments.map((comment, index) => (
                  <div key={comment._id || index} className="flex space-x-3 text-sm">
                    <Avatar
                      name={comment.author?.name || 'User'}
                      avatar={comment.author?.avatar}
                      size="sm"
                    />
                    <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 text-xs">
                          {comment.author?.name || 'User'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {comment.createdAt
                            ? new Date(comment.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 italic">No comments yet.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export const TaskModal = () => {
  const { activeTask } = useBoardStore();

  if (!activeTask) return null;

  return <TaskModalContent key={activeTask._id} task={activeTask} />;
};

export default TaskModal;
