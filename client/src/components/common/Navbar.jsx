import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Avatar from './Avatar';
import NotificationDropdown from './NotificationDropdown';
import Toast from './Toast';
import { socket } from '../../socket/socketClient';
import axiosInstance from '../../api/axiosInstance';
import { Layout, LogOut, Bell } from 'lucide-react';

export const Navbar = ({ title, onRefreshData }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const dropdownRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Fetch pending invitations count on mount
  useEffect(() => {
    if (!user) return;

    const fetchPendingCount = async () => {
      try {
        const res = await axiosInstance.get('/invitations/pending');
        setUnreadCount(res.data.invitations?.length || 0);
      } catch (err) {
        console.error('Failed to fetch invitation count:', err);
      }
    };

    fetchPendingCount();
  }, [user]);

  // Real-time socket listener for incoming notifications
  useEffect(() => {
    if (!user || !socket) return;

    const onNotificationReceived = (invitation) => {
      setUnreadCount((prev) => prev + 1);
      const sender = invitation.sender?.name || 'Someone';
      const boardTitle = invitation.board?.title || invitation.workspace?.name || 'a board';
      showToast(`${sender} invited you to join ${boardTitle}!`, 'success');
      if (onRefreshData) onRefreshData();
    };

    socket.on('notification:received', onNotificationReceived);

    return () => {
      socket.off('notification:received', onNotificationReceived);
    };
  }, [user, socket, onRefreshData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm select-none relative z-30">
      <div className="flex items-center space-x-3">
        <Link to="/dashboard" className="flex items-center space-x-2 text-brand-600 font-bold text-xl hover:opacity-90 transition">
          <Layout className="w-6 h-6 text-brand-500" />
          <span>CollabBoard</span>
        </Link>
        {title && (
          <>
            <span className="text-gray-300">/</span>
            <h1 className="font-semibold text-gray-800 text-lg">{title}</h1>
          </>
        )}
      </div>

      {user && (
        <div className="flex items-center space-x-4">
          {/* Notification Bell Icon */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setIsNotificationsOpen((prev) => !prev);
              }}
              className="p-2 text-gray-500 hover:text-brand-600 hover:bg-gray-100 rounded-full transition relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            <NotificationDropdown
              isOpen={isNotificationsOpen}
              onClose={() => setIsNotificationsOpen(false)}
              onShowToast={showToast}
              onInvitationResponded={() => {
                setUnreadCount((prev) => Math.max(0, prev - 1));
                if (onRefreshData) onRefreshData();
              }}
            />
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
            <Avatar name={user.name} avatar={user.avatar} size="md" />
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600 transition px-2 py-1 rounded hover:bg-gray-100"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      )}

      {/* Toast notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </header>
  );
};

export default Navbar;
