import React from 'react';

export const Avatar = ({ name, avatar, size = 'md', className = '' }) => {
  const getInitials = (str) => {
    if (!str) return '?';
    return str
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || 'User avatar'}
        className={`rounded-full object-cover border border-gray-200 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-brand-500 text-white font-semibold flex items-center justify-center shadow-sm select-none ${sizeClasses[size]} ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};

export default Avatar;
