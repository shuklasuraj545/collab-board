import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import BoardCanvas from '../components/board/BoardCanvas';
import LiveCursorOverlay from '../components/board/LiveCursorOverlay';
import TaskModal from '../components/board/TaskModal';
import InviteMemberModal from '../components/board/InviteMemberModal';
import ManageMembersModal from '../components/board/ManageMembersModal';
import Avatar from '../components/common/Avatar';
import Toast from '../components/common/Toast';
import { useBoardStore } from '../store/boardStore';
import { useSocket } from '../hooks/useSocket';
import { usePresence } from '../hooks/usePresence';
import axiosInstance from '../api/axiosInstance';
import { Wifi, WifiOff, UserPlus, Users } from 'lucide-react';

export const BoardPage = () => {
  const { boardId } = useParams();
  const { board, setBoard, isLoading, setIsLoading, setError, error } = useBoardStore();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Socket & Presence connection hooks
  const { isConnected } = useSocket(boardId);
  const { remoteCursors } = usePresence(boardId);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        setIsLoading(true);
        const res = await axiosInstance.get(`/boards/${boardId}`);
        setBoard(res.data.board);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load board');
      }
    };

    if (boardId) {
      fetchBoard();
    }
  }, [boardId]);

  if (isLoading && !board) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Loading Board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg border border-red-200 text-center max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Board</h2>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <a href="/dashboard" className="inline-block bg-brand-500 text-white px-4 py-2 rounded-lg font-medium text-sm">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300 relative select-none"
      style={{ backgroundColor: board?.background || '#0079BF' }}
    >
      {/* Navbar with board title */}
      <Navbar title={board?.title || 'Board'} />

      {/* Subheader / Status Bar */}
      <div className="bg-black/20 backdrop-blur-sm text-white px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="font-bold text-lg">{board?.title}</h2>

          {/* Members Avatars List & Manage Button */}
          {board?.members && board.members.length > 0 && (
            <div className="flex items-center space-x-2 pl-3 border-l border-white/20">
              <div className="flex -space-x-1.5 overflow-hidden">
                {board.members.map((member) => (
                  <Avatar
                    key={typeof member === 'object' ? member._id : member}
                    name={typeof member === 'object' ? member.name : 'Member'}
                    avatar={typeof member === 'object' ? member.avatar : ''}
                    size="sm"
                    className="border-2 border-white/40"
                  />
                ))}
              </div>

              {/* Members List Button */}
              <button
                onClick={() => setIsManageMembersOpen(true)}
                className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg backdrop-blur-sm transition"
                title="Manage board members"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Members ({board.members.length})</span>
              </button>
            </div>
          )}

          {/* Invite Member Button */}
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center space-x-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-sm"
            title="Invite member to board"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Socket Connection Indicator */}
          <div className="flex items-center space-x-1.5 text-xs font-medium bg-black/30 px-3 py-1 rounded-full">
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-300">Live Sync</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-300">Connecting...</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Board Drag & Drop Canvas */}
      <BoardCanvas boardId={boardId} />

      {/* Live Remote Cursors Overlay */}
      <LiveCursorOverlay cursors={remoteCursors} />

      {/* Task Modal for viewing/editing active task */}
      <TaskModal />

      {/* Invite Member Modal */}
      <InviteMemberModal
        boardId={boardId}
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onShowToast={showToast}
      />

      {/* Manage Members Modal */}
      <ManageMembersModal
        boardId={boardId}
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
        onShowToast={showToast}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
};

export default BoardPage;
