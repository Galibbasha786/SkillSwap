// frontend-web/src/pages/MutualMatches.jsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiStar, FiCalendar, FiClock, FiCheck, FiX, FiPhone, FiMapPin, FiMail } from 'react-icons/fi';
import { userAPI, swapAPI } from '../services/api';
import toast from 'react-hot-toast';
import BackButton from '../components/common/BackButton';

const MutualMatches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    fetchMutualMatches();
  }, []);

  const fetchMutualMatches = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getMutualMatches();
      setMatches(response.data);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSwap = async () => {
    if (!selectedDate) {
      toast.error('Please select a date and time');
      return;
    }

    try {
      await swapAPI.createFreeSwap({
        partnerId: selectedMatch.user._id,
        myTeachSkill: selectedMatch.matches[0].myTeach,
        myLearnSkill: selectedMatch.matches[0].myLearn,
        date: selectedDate,
        duration: selectedDuration
      });
      
      toast.success('Free skill swap created! Check your sessions.');
      setShowBookingModal(false);
      fetchMutualMatches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create swap');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-4">
          <BackButton />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🤝 Mutual Skill Matches</h1>
          <p className="text-gray-600 mt-2">
            Users who want to learn what you teach, and can teach what you want to learn
          </p>
          <div className="mt-2 inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
            Free Skill Swaps - No Payment Required!
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No mutual matches found yet</p>
            <p className="text-sm text-gray-400">Add more skills to find better matches!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {matches.map((match, index) => (
              <motion.div
                key={match.user._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start gap-6 flex-wrap">
                  <div className="flex items-start gap-4">
                      <img
                        src={match.user.profileImage || 'https://via.placeholder.com/80'}
                        alt={match.user.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">{match.user.name}</h3>
                        <div className="flex items-center gap-2 mt-1 mb-2">
                          <FiStar className="text-yellow-500 fill-current" />
                          <span className="text-gray-600">{match.user.rating?.toFixed(1) || 'New'}</span>
                        </div>
                        
                        {/* Contact Info Preview */}
                        <div className="space-y-1 text-xs text-gray-600">
                          {match.user.email && (
                            <div className="flex items-center gap-2">
                              <FiMail className="w-3 h-3 text-blue-500" />
                              <span>{match.user.email}</span>
                            </div>
                          )}
                          {match.user.phone && (
                            <div className="flex items-center gap-2">
                              <FiPhone className="w-3 h-3 text-blue-500" />
                              <span>{match.user.phone}</span>
                            </div>
                          )}
                          {match.user.location && (match.user.location.city || match.user.location.state) && (
                            <div className="flex items-center gap-2">
                              <FiMapPin className="w-3 h-3 text-blue-500" />
                              <span>
                                {[match.user.location.city, match.user.location.state]
                                  .filter(Boolean)
                                  .join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Skill Swap Details */}
                    <div className="flex-1">
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium mb-2">✨ Perfect Match!</p>
                        {match.matches.map((skillMatch, idx) => (
                          <div key={idx} className="flex items-center gap-3 text-sm">
                            <div className="flex-1 text-right">
                              <span className="font-medium text-gray-900">{skillMatch.myTeach}</span>
                              <span className="text-gray-500 ml-1">(You teach)</span>
                            </div>
                            <div className="text-green-500">⟷</div>
                            <div className="flex-1">
                              <span className="font-medium text-gray-900">{skillMatch.theirTeach}</span>
                              <span className="text-gray-500 ml-1">(They teach)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        setSelectedMatch(match);
                        setShowBookingModal(true);
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition-colors font-medium flex items-center gap-2"
                    >
                      <FiCalendar className="w-4 h-4" />
                      Schedule Free Swap
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && selectedMatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Schedule Free Swap</h2>
              
              {/* Partner Info */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-xs font-semibold text-gray-700 mb-2">Partner Details</h3>
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="font-medium text-gray-900">{selectedMatch.user.name}</div>
                  {selectedMatch.user.email && (
                    <div className="flex items-center gap-2">
                      <FiMail className="w-3 h-3 text-blue-500" />
                      <span>{selectedMatch.user.email}</span>
                    </div>
                  )}
                  {selectedMatch.user.phone && (
                    <div className="flex items-center gap-2">
                      <FiPhone className="w-3 h-3 text-blue-500" />
                      <span>{selectedMatch.user.phone}</span>
                    </div>
                  )}
                  {selectedMatch.user.location && (selectedMatch.user.location.city || selectedMatch.user.location.state || selectedMatch.user.location.country) && (
                    <div className="flex items-center gap-2">
                      <FiMapPin className="w-3 h-3 text-blue-500" />
                      <span>
                        {[selectedMatch.user.location.city, selectedMatch.user.location.state, selectedMatch.user.location.country]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  🤝 This is a free skill swap! No payment required.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSwap}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600"
                >
                  Confirm Free Swap
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MutualMatches;