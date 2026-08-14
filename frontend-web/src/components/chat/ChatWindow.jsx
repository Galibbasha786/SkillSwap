// src/components/chat/ChatWindow.jsx

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiVideo, FiPhone, FiPaperclip, FiSmile, FiX, FiMessageCircle } from 'react-icons/fi';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { chatAPI } from '../../services/api';
import MessageBubble from './MessageBubble';
import toast from 'react-hot-toast';

const ChatWindow = ({ chat, onClose, onStartCall, onMessagesUpdate }) => {
  const { user } = useAuth();
  const { socket, sendMessage, sendTyping, joinChat } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // WhatsApp Integration State
  const [participantPhone, setParticipantPhone] = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  // State for unread messages
  const [unreadMessages, setUnreadMessages] = useState([]);

  // Mark messages as read when user views them
  useEffect(() => {
    if (messages.length > 0 && chat?._id) {
      const unread = messages.filter(
        msg => !msg.read && msg.senderId !== user.id
      );
      
      if (unread.length > 0) {
        const unreadIds = unread.map(msg => msg._id);
        
        // Mark as read via socket
        socket?.emit('mark-read', {
          chatId: chat._id,
          messageIds: unreadIds
        });
        
        // Update local state
        setMessages(prev =>
          prev.map(msg =>
            unreadIds.includes(msg._id)
              ? { ...msg, read: true }
              : msg
          )
        );
      }
    }
  }, [messages.length, chat?._id]);

  // Listen for read receipts
  useEffect(() => {
    if (!socket) return;

    const handleMessagesRead = ({ messageIds, readerId, readAt }) => {
      if (readerId !== user.id) {
        setMessages(prev =>
          prev.map(msg =>
            messageIds.includes(msg._id)
              ? { ...msg, read: true, readAt }
              : msg
          )
        );
      }
    };

    socket.on('messages-read', handleMessagesRead);

    return () => {
      socket.off('messages-read', handleMessagesRead);
    };
  }, [socket, user.id]);

  // Fetch messages when chat changes
  useEffect(() => {
    if (chat?._id) {
      fetchMessages();
      fetchParticipantPhone();
      joinChat(chat._id);
    }
  }, [chat?._id]);

  // Fetch participant's phone number
  const fetchParticipantPhone = async () => {
    try {
      setPhoneLoading(true);
      const otherUser = chat?.participants?.find(p => p._id !== user.id);
      if (otherUser?._id) {
        const response = await chatAPI.getParticipantDetails(otherUser._id);
        setParticipantPhone(response.data?.phone || null);
      }
    } catch (error) {
      console.error('Error fetching participant phone:', error);
      setParticipantPhone(null);
    } finally {
      setPhoneLoading(false);
    }
  };

  // Generate WhatsApp link
  const getWhatsAppLink = () => {
    if (!participantPhone) return null;
    const phoneNumber = participantPhone.replace(/\D/g, '');
    return `https://wa.me/91${phoneNumber}`;
  };

  // Handle WhatsApp button click
  const handleWhatsAppClick = () => {
    const link = getWhatsAppLink();
    if (link) {
      window.open(link, '_blank');
    } else {
      toast.error('Phone number not available');
    }
  };

  // Listen for new messages via socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      console.log('New message received:', message);
      setMessages(prev => {
        const messageId = message._id || message.id;
        if (messageId && prev.some(item => (item._id || item.id) === messageId)) {
          return prev;
        }

        const optimisticIndex = prev.findIndex(item => {
          const itemSenderId = item.senderId?._id || item.senderId;
          const messageSenderId = message.senderId?._id || message.senderId;
          const itemTime = new Date(item.timestamp || item.createdAt || 0).getTime();
          const messageTime = new Date(message.timestamp || message.createdAt || Date.now()).getTime();

          return item.status === 'sending' &&
            item.content === message.content &&
            String(itemSenderId) === String(messageSenderId) &&
            Math.abs(messageTime - itemTime) < 10000;
        });

        if (optimisticIndex >= 0) {
          const next = [...prev];
          next[optimisticIndex] = message;
          return next;
        }

        return [...prev, message];
      });
      if (onMessagesUpdate) onMessagesUpdate();
    };

    const handleUserTyping = ({ userId, isTyping }) => {
      if (userId !== user.id) {
        setTypingUsers(prev => 
          isTyping ? [...prev, userId] : prev.filter(id => id !== userId)
        );
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('user-typing', handleUserTyping);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('user-typing', handleUserTyping);
    };
  }, [socket, user.id, onMessagesUpdate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getMessages(chat._id);
      console.log('Fetched messages:', response.data);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      id: Date.now(),
      content: newMessage,
      senderId: user.id,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    // Optimistically add to UI
    setMessages([...messages, messageData]);
    
    // Send via socket
    sendMessage(chat._id, messageData);
    
    setNewMessage('');
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(chat._id, true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(chat._id, false);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle video call
  const handleVideoCall = () => {
    if (onStartCall) {
      onStartCall(otherParticipant, true);
    } else {
      toast.error('Video call feature coming soon');
    }
  };

  // Handle audio call
  const handleAudioCall = () => {
    if (onStartCall) {
      onStartCall(otherParticipant, false);
    } else {
      toast.error('Audio call feature coming soon');
    }
  };

  const otherParticipant = chat?.participants?.find(p => p._id !== user.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-500 text-white">
        <div className="flex items-center gap-3 flex-1">
          <img
            src={otherParticipant?.profileImage || 'https://via.placeholder.com/40'}
            alt={otherParticipant?.name}
            className="w-10 h-10 rounded-full border-2 border-white object-cover"
          />
          <div className="flex-1">
            <h3 className="font-semibold">{otherParticipant?.name || 'Teacher'}</h3>
            <div className="text-xs text-blue-100 flex items-center gap-2">
              {phoneLoading ? (
                <span>Loading contact...</span>
              ) : participantPhone ? (
                <span className="flex items-center gap-1">
                  📱 {participantPhone}
                </span>
              ) : (
                <span className="text-blue-100">No mobile number</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Video Call Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleVideoCall}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Start video call"
          >
            <FiVideo className="w-5 h-5" />
          </motion.button>
          
          {/* Audio Call Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAudioCall}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Start audio call"
          >
            <FiPhone className="w-5 h-5" />
          </motion.button>
          
          {/* WhatsApp Button */}
          {participantPhone && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleWhatsAppClick}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1 px-3"
              title="Chat on WhatsApp"
            >
              <FiMessageCircle className="w-5 h-5" />
              <span className="text-xs hidden sm:inline">WhatsApp</span>
            </motion.button>
          )}
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Close chat"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-sm text-gray-500 italic">
          {otherParticipant?.name} is typing...
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No messages yet</p>
            <p className="text-sm mt-2">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message._id || message.id || index}
                message={message}
                isOwn={message.senderId === user.id || message.senderId?._id === user.id}
              />
            ))}
            {typingUsers.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-gray-200 rounded-lg px-4 py-2 text-gray-500 text-sm">
                  {otherParticipant?.name} is typing...
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={handleTyping}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              rows="1"
              className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              style={{ maxHeight: '120px' }}
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <FiPaperclip className="w-4 h-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                <FiSmile className="w-4 h-4" />
              </button>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
