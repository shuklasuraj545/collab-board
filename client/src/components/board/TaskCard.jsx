import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Avatar from '../common/Avatar';
import { MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';

export const TaskCard = ({ task }) => {
  const { setActiveTask } = useBoardStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800 font-bold',
  };

  const commentCount = task.comments?.length || 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setActiveTask(task)}
      className="bg-white p-3.5 rounded-lg shadow-sm hover:shadow-md border border-gray-200 cursor-grab active:cursor-grabbing transition group select-none space-y-2.5"
    >
      {/* Priority & Labels */}
      <div className="flex items-center justify-between">
        {task.priority && (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${
              priorityColors[task.priority] || priorityColors.medium
            }`}
          >
            {task.priority}
          </span>
        )}
        {task.labels && task.labels.length > 0 && (
          <div className="flex space-x-1">
            {task.labels.map((l, idx) => (
              <span
                key={idx}
                className="w-4 h-1.5 rounded-full"
                style={{ backgroundColor: l.color || '#3b82f6' }}
                title={l.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-gray-900 leading-snug group-hover:text-brand-600 transition">
        {task.title}
      </h4>

      {/* Footer Info: due date, comments, assignees */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-50">
        <div className="flex items-center space-x-3">
          {task.dueDate && (
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
          )}

          {commentCount > 0 && (
            <div className="flex items-center space-x-1">
              <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
              <span>{commentCount}</span>
            </div>
          )}
        </div>

        {/* Assignees Avatars */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex -space-x-1 overflow-hidden">
            {task.assignees.map((assignee) => (
              <Avatar
                key={typeof assignee === 'object' ? assignee._id : assignee}
                name={typeof assignee === 'object' ? assignee.name : 'Assignee'}
                avatar={typeof assignee === 'object' ? assignee.avatar : ''}
                size="sm"
                className="border-2 border-white"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
