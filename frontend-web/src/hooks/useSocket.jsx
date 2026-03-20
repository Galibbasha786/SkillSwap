// src/hooks/useSocket.js

import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './useAuth';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

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
      transports: ['websocket']
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

    socketRef.current.on('incoming-call', (data) => {
      toast.custom((t) => (
        <div className={`bg-white rounded-lg shadow-lg p-4 max-w-sm ${t.visible ? 'animate-enter' : 'animate-leave'}`}>
          <h3 className="font-semibold text-gray-900">Incoming Call</h3>
          <p className="text-gray-600">Someone is calling you...</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                // Accept call logic
              }}
              className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
            >
              Accept
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
            >
              Decline
            </button>
          </div>
        </div>
      ), { duration: 30000 });
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