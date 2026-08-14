// src/hooks/useSocket.js

import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './useAuth';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/api\/?$/, '');

export const useSocket = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef();

  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('token'),
        userId: user.id
      },
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      setSocket(socketRef.current);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  const joinChat = (chatId) => {
    if (socketRef.current) {
      socketRef.current.emit('join-chat', chatId);
    }
  };

  const sendMessage = (chatId, message) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', { chatId, message });
    }
  };

  const sendTyping = (chatId, isTyping) => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { chatId, isTyping });
    }
  };

  const startCall = (userId) => {
    if (socketRef.current) {
      socketRef.current.emit('call-user', { userId });
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinChat,
    sendMessage,
    sendTyping,
    startCall
  };
};
