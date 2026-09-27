import React from 'react';
import { MousePointer2 } from 'lucide-react';

export const LiveCursorOverlay = ({ cursors = {} }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {Object.entries(cursors).map(([userId, cursor]) => {
        if (!cursor || typeof cursor.x !== 'number' || typeof cursor.y !== 'number') return null;

        return (
          <div
            key={userId}
            className="absolute transition-all duration-75 ease-out flex items-center space-x-1"
            style={{
              left: `${cursor.x}px`,
              top: `${cursor.y}px`,
            }}
          >
            <MousePointer2
              className="w-5 h-5 drop-shadow-md"
              style={{
                color: cursor.color || '#3b82f6',
                fill: cursor.color || '#3b82f6',
              }}
            />
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold text-white shadow-md select-none whitespace-nowrap"
              style={{ backgroundColor: cursor.color || '#3b82f6' }}
            >
              {cursor.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default LiveCursorOverlay;
