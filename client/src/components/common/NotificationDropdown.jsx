import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { Check, X, Bell, Inbox } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

export const NotificationDropdown = ({ isOpen, onClose, onInvitationResponded, onShowToast }) => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchPendingInvitations = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/invitations/pending');
      setInvitations(res.data.invitations || []);
    } catch (err) {
      console.error('Failed to fetch pending invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPendingInvitations();
    }
  }, [isOpen]);

  const handleRespond = async (invitationId, action) => {
    try {
      setActionLoadingId(invitationId);
      const res = await axiosInstance.post(`/invitations/${invitationId}/respond`, { action });

      // Remove responded invitation from list
      setInvitations((prev) => prev.filter((item) => item._id !== invitationId));

      if (onShowToast) {
        onShowToast(
          action === 'accept' ? 'Joined board successfully!' : 'Invitation declined',
          action === 'accept' ? 'success' : 'info'
        );
      }

      if (onInvitationResponded) {
        onInvitationResponded();
      }
    } catch (err) {
      const msg = err.response?.data?.error || `Failed to ${action} invitation`;
      if (onShowToast) onShowToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="w-4 h-4 text-brand-500" />
          <h3 className="font-bold text-sm text-gray-800">Notifications</h3>
        </div>
        <span className="text-xs bg-brand-100 text-brand-700 font-semibold px-2 py-0.5 rounded-full">
          {invitations.length} Pending
        </span>
      </div>

      {/* Body */}
      <div className="max-h-96 overflow-y-auto custom-scrollbar p-2 divide-y divide-gray-100">
        {loading && invitations.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">Loading notifications...</div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-2 text-gray-400">
            <Inbox className="w-8 h-8 stroke-1" />
            <p className="text-sm font-medium">No pending invitations</p>
            <p className="text-xs">When team members invite you to boards, they will appear here.</p>
          </div>
        ) : (
          invitations.map((inv) => {
            const senderName = inv.sender?.name || 'A user';
            const boardTitle = inv.board?.title || inv.workspace?.name || 'a board';
            const bg = inv.board?.background || '#0079BF';
            const isProcessing = actionLoadingId === inv._id;

            return (
              <div key={inv._id} className="p-3 hover:bg-gray-50/80 transition rounded-lg space-y-2">
                <div className="flex items-start space-x-3">
                  <Avatar name={senderName} avatar={inv.sender?.avatar} size="md" />
                  <div className="flex-1 text-xs">
                    <p className="text-gray-800 leading-snug">
                      <span className="font-semibold text-gray-900">{senderName}</span> invited you to join{' '}
                      <span className="font-semibold text-brand-600">{boardTitle}</span>
                    </p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">
                      {inv.createdAt
                        ? new Date(inv.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Just now'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 pt-1">
                  <button
                    onClick={() => handleRespond(inv._id, 'reject')}
                    disabled={isProcessing}
                    className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-md transition disabled:opacity-50"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleRespond(inv._id, 'accept')}
                    disabled={isProcessing}
                    className="px-3 py-1 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-md shadow-sm transition flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Joining...' : 'Accept'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
