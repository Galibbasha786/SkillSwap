// frontend-web/src/pages/Sessions.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCalendar, 
  FiClock, 
  FiVideo, 
  FiStar,
  FiUser,
  FiCheckCircle,
  FiXCircle,
  FiExternalLink,
  FiTrash2,
  FiAlertCircle
} from 'react-icons/fi';
import { sessionAPI } from '../services/api';
import toast from 'react-hot-toast';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await sessionAPI.getAll();
      setSessions(response.data || []);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    const sessionDate = new Date(session.date);
    const now = new Date();

    if (filter === 'upcoming') {
      return sessionDate > now && session.status !== 'cancelled' && session.status !== 'completed';
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

  const handleJoinMeet = (meetLink) => {
  if (!meetLink) {
    toast.error('No meeting link available');
    return;
  }
  
  // Open in new tab
  window.open(meetLink, '_blank', 'noopener,noreferrer');
};
  const handleCancelClick = (session) => {
    setSelectedSession(session);
    setShowCancelModal(true);
  };

  const handleCancelSession = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      setActionLoading(true);
      await sessionAPI.cancelSession(selectedSession._id, { reason: cancelReason });
      
      setSessions(prev => prev.map(s => 
        s._id === selectedSession._id 
          ? { ...s, status: 'cancelled', cancellationReason: cancelReason } 
          : s
      ));
      
      toast.success('Session cancelled');
      setShowCancelModal(false);
      setCancelReason('');
    } catch (error) {
      toast.error('Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;

    try {
      await sessionAPI.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      toast.success('Session deleted');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const canCancel = (session) => {
    return new Date(session.date) > new Date() && session.status === 'scheduled';
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
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white">
                      <FiVideo className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
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
                      
                      {/* Meet Link */}
                      {session.meetLink && session.status !== 'cancelled' && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-gray-400">Meeting:</span>
                          <span className="text-xs font-mono text-gray-600">
                            {session.meetLink}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {/* Join Button */}
                   
{session.meetLink && session.status === 'scheduled' && (
  <button
    onClick={() => handleJoinMeet(session.meetLink)}
    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
  >
    <FiVideo className="w-4 h-4" />
    Join {session.meetProvider === 'jitsi' ? 'Jitsi' : 'Google'} Meet
  </button>
)}
                    
                    {/* Cancel Button */}
                    {canCancel(session) && (
                      <button
                        onClick={() => handleCancelClick(session)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                      >
                        <FiXCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    )}

                    {/* Delete Button */}
                    {(session.status === 'cancelled' || session.status === 'completed') && (
                      <button
                        onClick={() => handleDeleteSession(session._id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && selectedSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
            >
              <h3 className="text-xl font-bold mb-4">Cancel Session</h3>
              
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full px-4 py-2 border rounded-lg mb-4"
                rows="3"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleCancelSession}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  {actionLoading ? 'Processing...' : 'Confirm Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sessions;