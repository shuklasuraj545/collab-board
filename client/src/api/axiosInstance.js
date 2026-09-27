import axios from 'axios';
import { socket } from '../socket/socketClient';

const axiosInstance = axios.create({
  baseURL: '/api',
  withCredentials: true, // Crucial for sending HTTP-only cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach x-socket-id header if socket is connected
axiosInstance.interceptors.request.use((config) => {
  if (socket && socket.id) {
    config.headers['x-socket-id'] = socket.id;
  }
  return config;
});

// Interceptor for handling auth errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
