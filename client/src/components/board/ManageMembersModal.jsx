import React, { useState } from 'react';
import { X, Users, UserX, ShieldCheck, User } from 'lucide-react';
import Avatar from '../common/Avatar';
import axiosInstance from '../../api/axiosInstance';
import { useBoardStore } from '../../store/boardStore';
import { useAuth } from '../../hooks/useAuth';

export const ManageMembersModal = ({ boardId, isOpen, onClose, onShowToast }) => {
  const { board, removeBoardMember } = useBoardStore();
  const { user: currentUser } = useAuth();
  const [removingId, setRemovingId] = useState(null);

  if (!isOpen || !board) return null;

  const currentUserId = currentUser?.id || currentUser?._id;
  const ownerId = typeof board.createdBy === 'object' ? board.createdBy?._id : board.createdBy;
  const isOwner = ownerId && currentUserId && ownerId.toString() === currentUserId.toString();

  const handleRemoveMember = async (memberId) => {
    if (!isOwner || removingId) return;

    setRemovingId(memberId);

    try {
      await axiosInstance.delete(`/boards/${boardId}/members/${memberId}`);
      removeBoardMember(memberId);
      if (onShowToast) {
        onShowToast('Member removed successfully', 'success');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to remove member';
      if (onShowToast) onShowToast(msg, 'error');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center space-x-2 text-gray-900 font-bold text-lg">
            <Users className="w-5 h-5 text-brand-500" />
            <span>Board Members ({board.members?.length || 0})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member List */}
        <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-gray-100 pr-1">
          {board.members && board.members.length > 0 ? (
            board.members.map((member) => {
              const mId = typeof member === 'object' ? member._id : member;
              const mName = typeof member === 'object' ? member.name : 'Member';
              const mEmail = typeof member === 'object' ? member.email : '';
              const mAvatar = typeof member === 'object' ? member.avatar : '';
              const isThisOwner = ownerId && mId && ownerId.toString() === mId.toString();

              return (
                <div key={mId} className="py-3 flex items-center justify-between hover:bg-gray-50/60 px-2 rounded-lg transition">
                  <div className="flex items-center space-x-3">
                    <Avatar name={mName} avatar={mAvatar} size="md" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-gray-900">{mName}</span>
                        {isThisOwner ? (
                          <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Owner</span>
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                            Member
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{mEmail}</span>
                    </div>
                  </div>

                  {/* Remove Button — visible to Owner only, for non-owner members */}
                  {isOwner && !isThisOwner && (
                    <button
                      onClick={() => handleRemoveMember(mId)}
                      disabled={removingId === mId}
                      className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 px-2.5 py-1 rounded-md transition font-medium disabled:opacity-50"
                      title="Remove member from board"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>{removingId === mId ? 'Removing...' : 'Remove'}</span>
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-xs text-gray-400 italic text-center py-4">No members found.</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default ManageMembersModal;
