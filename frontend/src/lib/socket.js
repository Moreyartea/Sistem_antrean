import { io } from 'socket.io-client';

// Determine connection URL (can be empty string for same-origin proxy or direct backend port)
const SOCKET_URL = window.location.port === '5173' || window.location.port === '5174'
  ? 'http://localhost:3000'
  : window.location.origin;

export const socket = io(SOCKET_URL, {
  path: '/socket.io/',
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

socket.on('connect', () => {
  console.log('⚡ [Socket.io Client] Connected with ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('🔌 [Socket.io Client] Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.warn('⚠️ [Socket.io Client] Connection error:', error.message);
});
