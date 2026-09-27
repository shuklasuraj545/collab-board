import React, { useState } from 'react';
import { X, UserPlus, Mail, AlertCircle } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';

export const InviteMemberModal = ({ boardId, isOpen, onClose, onShowToast }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setError('');
    setLoading(true);

    try {
      const res = await axiosInstance.post(`/boards/${boardId}/invite`, {
        email: email.trim(),
      });

      setEmail('');
      onClose();

      const successMsg =
        res.data.message || 'Invitation sent successfully! Waiting for recipient to accept.';
      if (onShowToast) {
        onShowToast(successMsg, 'success');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to send invitation';
      setError(msg);
      if (onShowToast) {
        onShowToast(msg, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center space-x-2 text-gray-900 font-bold text-lg">
            <UserPlus className="w-5 h-5 text-brand-500" />
            <span>Invite to Board</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error alert box */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Recipient Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              An invitation will be sent to this user. They will join the board once they accept.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="px-4 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg shadow transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default InviteMemberModal;
