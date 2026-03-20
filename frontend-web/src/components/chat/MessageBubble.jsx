// src/components/chat/MessageBubble.jsx

import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiCheckSquare } from 'react-icons/fi';

const MessageBubble = ({ message, isOwn }) => {
  // Safely format date
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return '';
    }
  };

  // Get message status icon
  const getStatusIcon = () => {
    if (message.status === 'sending') {
      return <FiCheck className="w-3 h-3 text-gray-400" />;
    }
    if (message.status === 'sent') {
      return <FiCheck className="w-3 h-3" />;
    }
    if (message.status === 'delivered') {
      return <FiCheckSquare className="w-3 h-3" />;
    }
    if (message.status === 'read') {
      return <FiCheckSquare className="w-3 h-3 text-blue-300" />;
    }
    // Check if message has read field from database
    if (message.read) {
      return <FiCheckSquare className="w-3 h-3 text-blue-300" />;
    }
    return <FiCheck className="w-3 h-3" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[70%] rounded-lg p-3 ${
          isOwn
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
            : 'bg-white text-gray-800 border border-gray-200'
        }`}
      >
        <p className="text-sm break-words">{message.content}</p>
        <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
          isOwn ? 'text-blue-100' : 'text-gray-500'
        }`}>
          <span>
            {formatTime(message.timestamp || message.createdAt)}
          </span>
          {isOwn && (
            <span>
              {getStatusIcon()}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;