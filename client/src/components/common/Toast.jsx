import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

export const Toast = ({ message, type = 'error', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isError = type === 'error';

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg text-white transition-all transform duration-200 ${
        isError ? 'bg-red-600' : 'bg-green-600'
      }`}
    >
      {isError ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
