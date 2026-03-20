// src/pages/Messages.jsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { FiSearch, FiUser } from 'react-icons/fi';
import ChatWindow from '../components/chat/ChatWindow';
import { useAuth } from '../hooks/useAuth';
import { chatAPI } from '../services/api';
import toast from 'react-hot-toast';

const Messages = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Format time for display
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const diff = now - date;
      const oneDay = 24 * 60 * 60 * 1000;
      
      if (diff < oneDay) {
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else if (diff < 2 * oneDay) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      console.error('Date formatting error:', error);
      return '';
    }
  };

  // Calculate unread count for each chat
  const getUnreadCount = (chat) => {
    if (!chat.messages || !user) return 0;
    
    return chat.messages.filter(msg => 
      !msg.read && msg.senderId !== user.id
    ).length;
  };

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    // Handle navigation from teacher profile
    const initChatFromTeacher = async () => {
      if (location.state?.selectedChat && !loading) {
        const teacherId = location.state.selectedChat;
        const teacherData = location.state.teacher;
        
        console.log('Initializing chat with teacher:', teacherId);
        
        // Check if chat already exists in current chats
        const existingChat = chats.find(c => 
          c.participants?.some(p => p._id === teacherId)
        );
        
        if (existingChat) {
          console.log('Found existing chat:', existingChat._id);
          setSelectedChat(existingChat);
        } else {
          // Create new chat with teacher
          try {
            console.log('Creating new chat with teacher:', teacherId);
            const response = await chatAPI.createChat({ participantId: teacherId });
            console.log('Chat created:', response.data);
            
            // Add teacher data to participants
            const newChat = {
              ...response.data,
              participants: [
                user,
                teacherData || { 
                  _id: teacherId, 
                  name: 'Teacher', 
                  profileImage: 'https://via.placeholder.com/40' 
                }
              ]
            };
            
            setChats(prevChats => [newChat, ...prevChats]);
            setSelectedChat(newChat);
          } catch (error) {
            console.error('Error creating chat:', error);
            toast.error('Failed to start chat');
          }
        }
      }
    };

    initChatFromTeacher();
  }, [location.state, chats, loading, user]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getConversations();
      console.log('Chats response:', response.data);
      
      // Ensure each chat has messages array
      const chatsWithMessages = (Array.isArray(response.data) ? response.data : []).map(chat => ({
        ...chat,
        messages: chat.messages || []
      }));
      
      setChats(chatsWithMessages);
    } catch (error) {
      console.error('Error fetching chats:', error);
      toast.error('Failed to load conversations');
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  const filteredChats = Array.isArray(chats) 
    ? chats.filter(chat => {
        if (!chat || !chat.participants) return false;
        const otherParticipant = chat.participants.find(p => p._id !== user?.id);
        return otherParticipant?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : [];

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50">
      <div className="flex h-full">
        {/* Chat List Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Messages</h2>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FiUser className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No conversations yet</p>
                <p className="text-sm mt-2">Go to marketplace and message a teacher!</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                if (!chat || !chat.participants) return null;
                
                const otherParticipant = chat.participants.find(p => p._id !== user?.id);
                const lastMessage = chat.lastMessage;
                const unreadCount = getUnreadCount(chat);
                const lastMessageTime = chat.lastMessageTime || chat.updatedAt;
                
                return (
                  <motion.div
                    key={chat._id}
                    whileHover={{ backgroundColor: '#f3f4f6' }}
                    onClick={() => handleChatSelect(chat)}
                    className={`p-4 cursor-pointer border-b border-gray-100 transition-colors ${
                      selectedChat?._id === chat._id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={otherParticipant?.profileImage || 'https://via.placeholder.com/40'}
                          alt={otherParticipant?.name}
                          className="w-12 h-12 rounded-full"
                        />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={`font-semibold truncate ${
                            unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {otherParticipant?.name || 'Unknown User'}
                          </h3>
                          {lastMessageTime && (
                            <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">
                              {formatTime(lastMessageTime)}
                            </span>
                          )}
                        </div>
                        {lastMessage ? (
                          <p className={`text-sm truncate ${
                            unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}>
                            {lastMessage}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400 italic">
                            No messages yet
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1">
          {selectedChat ? (
            <ChatWindow
              chat={selectedChat}
              onClose={() => setSelectedChat(null)}
              onStartCall={(participant) => {
                toast.success('Video call coming soon!');
              }}
              onMessagesUpdate={fetchChats} // Refresh chat list when messages change
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FiUser className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Your Messages</p>
                <p className="text-sm">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;