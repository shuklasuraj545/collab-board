import { io } from 'socket.io-client';

// Single exported socket instance per Section 7 of reference doc
export const socket = io('http://localhost:5000', {
  withCredentials: true,
  autoConnect: false, // Explicitly controlled via useSocket hook
  transports: ['websocket', 'polling'],
});
