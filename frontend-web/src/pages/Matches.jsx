// frontend-web/src/pages/Matches.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUser, 
  FiMessageCircle, 
  FiCalendar, 
  FiStar,
  FiCheckCircle,
  FiXCircle,
  FiArrowRight,
  FiUsers
} from 'react-icons/fi';
import BackButton from '../components/common/BackButton';

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, mutual, pending

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockMatches = [
        {
          id: 1,
          name: 'Sarah Johnson',
          avatar: 'https://i.pravatar.cc/150?img=1',
          skillsTeach: ['JavaScript', 'React', 'Node.js'],
          skillsLearn: ['Guitar', 'Music Theory'],
          matchScore: 95,
          rating: 4.8,
          mutual: true,
          status: 'online',
          bio: 'Full-stack developer with 5 years experience. Love teaching coding!'
        },
        {
          id: 2,
          name: 'Mike Chen',
          avatar: 'https://i.pravatar.cc/150?img=2',
          skillsTeach: ['Guitar', 'Piano', 'Music Production'],
          skillsLearn: ['Python', 'Machine Learning'],
          matchScore: 88,
          rating: 4.9,
          mutual: true,
          status: 'offline',
          bio: 'Professional musician turned coding enthusiast. Let\'s exchange skills!'
        },
        {
          id: 3,
          name: 'Emma Wilson',
          avatar: 'https://i.pravatar.cc/150?img=3',
          skillsTeach: ['Yoga', 'Meditation', 'Pilates'],
          skillsLearn: ['Web Design', 'UI/UX'],
          matchScore: 82,
          rating: 4.7,
          mutual: false,
          status: 'online',
          bio: 'Yoga instructor looking to learn web design. Perfect match?'
        },
        {
          id: 4,
          name: 'Alex Rivera',
          avatar: 'https://i.pravatar.cc/150?img=4',
          skillsTeach: ['Spanish', 'French', 'Portuguese'],
          skillsLearn: ['JavaScript', 'React'],
          matchScore: 91,
          rating: 4.9,
          mutual: true,
          status: 'online',
          bio: 'Language teacher wanting to learn coding. Let\'s help each other!'
        },
        {
          id: 5,
          name: 'Priya Patel',
          avatar: 'https://i.pravatar.cc/150?img=5',
          skillsTeach: ['Data Science', 'Python', 'SQL'],
          skillsLearn: ['Photography', 'Photoshop'],
          matchScore: 79,
          rating: 4.6,
          mutual: false,
          status: 'offline',
          bio: 'Data scientist by day, aspiring photographer by night'
        },
        {
          id: 6,
          name: 'James Lee',
          avatar: 'https://i.pravatar.cc/150?img=6',
          skillsTeach: ['Guitar', 'Songwriting', 'Music Theory'],
          skillsLearn: ['Spanish', 'Public Speaking'],
          matchScore: 94,
          rating: 5.0,
          mutual: true,
          status: 'online',
          bio: 'Musician wanting to learn Spanish. Can teach guitar in exchange!'
        }
      ];
      setMatches(mockMatches);
      setLoading(false);
    }, 1500);
  }, []);

  const filteredMatches = matches.filter(match => {
    if (filter === 'mutual') return match.mutual;
    if (filter === 'pending') return !match.mutual;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Finding your perfect matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <BackButton />
            <h1 className="text-2xl font-bold text-gray-900">Your Skill Matches</h1>
          </div>
          <p className="text-gray-600">
            Found {filteredMatches.length} people who want to exchange skills with you
          </p>

          {/* Filter Tabs */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Matches
            </button>
            <button
              onClick={() => setFilter('mutual')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                filter === 'mutual'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FiCheckCircle />
              Mutual Matches
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                filter === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FiXCircle />
              Pending
            </button>
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match, index) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Match Score Badge */}
                <div className="relative">
                  <div className={`absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    match.matchScore >= 90 ? 'bg-green-500' :
                    match.matchScore >= 80 ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}>
                    {match.matchScore}%
                  </div>
                  
                  {/* Cover Photo */}
                  <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                  
                  {/* Avatar */}
                  <div className="absolute left-6 -bottom-12">
                    <img
                      src={match.avatar}
                      alt={match.name}
                      className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="pt-14 p-6">
                  {/* Name and Status */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{match.name}</h3>
                    <div className={`w-3 h-3 rounded-full ${
                      match.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-600">{match.rating}</span>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{match.bio}</p>

                  {/* Skills Exchange */}
                  <div className="space-y-3 mb-4">
                    {/* Teaches */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Teaches:</p>
                      <div className="flex flex-wrap gap-1">
                        {match.skillsTeach.map((skill, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Wants to Learn */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Wants to learn:</p>
                      <div className="flex flex-wrap gap-1">
                        {match.skillsLearn.map((skill, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Mutual Match Badge */}
                  {match.mutual && (
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">
                        <FiUsers className="w-3 h-3" />
                        Mutual Match - You both can exchange skills!
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                      <FiMessageCircle />
                      Chat
                    </button>
                    <button className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                      <FiCalendar />
                      Schedule
                    </button>
                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <FiArrowRight />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>

        {/* No matches state */}
        {filteredMatches.length === 0 && (
          <div className="text-center py-12">
            <FiUsers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches found</h3>
            <p className="text-gray-600">
              Try adding more skills to your profile to find better matches
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Matches;