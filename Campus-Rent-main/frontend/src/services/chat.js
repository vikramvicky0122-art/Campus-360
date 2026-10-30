import { io } from 'socket.io-client';

// Derive the socket URL from VITE_API_URL's origin (same Express server for REST + Socket.IO)
// This ensures the socket always connects to the same host/port as the REST API,
// both in local dev and production. VITE_SOCKET_URL can override if needed.
const apiUrl = import.meta.env.VITE_API_URL;
const defaultSocketUrl = apiUrl
  ? new URL(apiUrl).origin
  : 'http://localhost:4000';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || defaultSocketUrl;

let socket = null;
let listeners = new Map();

/**
 * Initialize the socket connection with the user's JWT token.
 */
export const connectSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });

  socket.on('connect', () => {
    console.log('[Chat] Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Chat] Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Chat] Socket connection error:', error.message);
  });

  socket.on('message:new', (data) => {
    const handler = listeners.get('message:new');
    if (handler) handler(data);
  });

  socket.on('conversation:new', (data) => {
    const handler = listeners.get('conversation:new');
    if (handler) handler(data);
  });

  socket.on('unread', (data) => {
    const handler = listeners.get('unread');
    if (handler) handler(data);
  });

  socket.on('typing:update', (data) => {
    const handler = listeners.get('typing:update');
    if (handler) handler(data);
  });

  socket.on('error', (data) => {
    const handler = listeners.get('error');
    if (handler) handler(data);
  });

  socket.on('presence:update', (data) => {
    const handler = listeners.get('presence:update');
    if (handler) handler(data);
  });

  return socket;
};

/**
 * Disconnect the socket. Should be called on logout.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  listeners.clear();
};

/**
 * Join a conversation room via socket.
 */
export const joinConversation = (conversationId) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      return reject(new Error('Socket not connected'));
    }
    socket.emit('conversation:join', { conversationId }, (response) => {
      if (response?.error) {
        reject(new Error(response.message));
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Leave a conversation room.
 */
export const leaveConversation = (conversationId) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      return reject(new Error('Socket not connected'));
    }
    socket.emit('conversation:leave', { conversationId }, (response) => {
      if (response?.error) {
        reject(new Error(response.message));
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Send a message via socket.
 */
export const sendMessage = (conversationId, content) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      return reject(new Error('Socket not connected'));
    }
    socket.emit('message:send', { conversationId, content }, (response) => {
      if (response?.error) {
        reject(new Error(response.message));
      } else {
        resolve(response.data);
      }
    });
  });
};

/**
 * Emit typing:start to the server.
 * Only emits once per debounce window. Debounce is handled by the caller (Chat.jsx).
 */
export const emitTypingStart = (conversationId) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) return resolve();
    socket.emit('typing:start', { conversationId }, (response) => {
      if (response?.error) {
        reject(new Error(response.message));
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Emit typing:stop to the server.
 */
export const emitTypingStop = (conversationId) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) return resolve();
    socket.emit('typing:stop', { conversationId }, (response) => {
      if (response?.error) {
        reject(new Error(response.message));
      } else {
        resolve(response);
      }
    });
  });
};

/**
 * Register a listener for socket events.
 * Events: 'message:new', 'conversation:new', 'unread', 'typing:update', 'presence:update', 'error'
 */
export const onChatEvent = (event, handler) => {
  listeners.set(event, handler);
};

/**
 * Remove a listener.
 */
export const offChatEvent = (event) => {
  listeners.delete(event);
};

/**
 * Get the underlying socket instance.
 */
export const getSocket = () => socket;
