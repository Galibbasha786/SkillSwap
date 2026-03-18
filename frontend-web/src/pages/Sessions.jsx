// src/pages/Sessions.jsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiCalendar, 
  FiClock, 
  FiVideo, 
  FiStar,
  FiUser,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle
} from 'react-icons/fi';
import { sessionAPI } from '../services/api';
import VideoCall from '../components/video/VideoCall';
import toast from 'react-hot-toast';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past, cancelled

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await sessionAPI.getAll();
      setSessions(response.data);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCall = (session) => {
    setActiveSession(session);
  };

  const handleJoinCall = (session) => {
    setActiveSession(session);
  };

  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.date);
    const now = new Date();

    if (filter === 'upcoming') {
      return sessionDate > now && session.status !== 'cancelled';
    } else if (filter === 'past') {
      return sessionDate < now || session.status === 'completed';
    } else if (filter === 'cancelled') {
      return session.status === 'cancelled';
    }
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-600';
      case 'ongoing': return 'bg-green-100 text-green-600';
      case 'completed': return 'bg-gray-100 text-gray-600';
      case 'cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Sessions</h1>
          
          {/* Filters */}
          <div className="flex gap-2">
            {['upcoming', 'past', 'cancelled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === f
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <FiCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No {filter} sessions found</p>
            </div>
          ) : (
            filteredSessions.map((session, index) => (
              <motion.div
                key={session._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Session Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white">
                      <FiVideo className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{session.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        with {session.teacherId?.name || session.learnerId?.name}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <FiCalendar className="w-3 h-3" />
                          {new Date(session.date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <FiClock className="w-3 h-3" />
                          {new Date(session.date).toLocaleTimeString()} ({session.duration} min)
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {session.status === 'scheduled' && new Date(session.date) <= new Date() && (
                      <button
                        onClick={() => handleStartCall(session)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                      >
                        <FiVideo />
                        Start Call
                      </button>
                    )}
                    {session.status === 'ongoing' && (
                      <button
                        onClick={() => handleJoinCall(session)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                      >
                        <FiVideo />
                        Join Call
                      </button>
                    )}
                    {session.status === 'completed' && !session.rating && (
                      <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
                        <FiStar />
                        Rate Session
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Video Call Modal */}
      {activeSession && (
        <VideoCall
          session={activeSession}
          onClose={() => setActiveSession(null)}
        />
      )}
    </div>
  );
};

export default Sessions;