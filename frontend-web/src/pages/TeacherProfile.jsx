
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiStar, 
  FiClock, 
  FiDollarSign, 
  FiAward,
  FiCalendar,
  FiMessageCircle,
  FiUser
} from 'react-icons/fi';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';
import BookingModal from '../components/sessions/BookingModal';

const TeacherProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    // Check if this is the current user's profile
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const currentUser = JSON.parse(savedUser);
      const currentUserId = currentUser.id || currentUser._id;
      setIsOwnProfile(currentUserId === id);
    }
    
    fetchTeacher();
  }, [id]);

  const fetchTeacher = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getProfile(id);
      setTeacher(response.data);
    } catch (error) {
      console.error('Error fetching teacher:', error);
      toast.error('Failed to load teacher profile');
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Teacher not found</h2>
          <button 
            onClick={() => navigate('/marketplace')}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500"></div>
          
          <div className="px-6 pb-6">
            <div className="flex items-end -mt-12 mb-4">
              <img
                src={teacher?.profileImage || 'https://via.placeholder.com/120'}
                alt={teacher?.name}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
              />
              <div className="ml-4 flex-1">
                <h1 className="text-2xl font-bold text-gray-900">{teacher?.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <FiStar className="w-5 h-5 text-yellow-500 fill-current" />
                  <span className="text-gray-600">{teacher?.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-gray-400">•</span>
                  <FiClock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{teacher?.totalSessions || 0} sessions</span>
                  {isOwnProfile && (
                    <>
                      <span className="text-gray-400">•</span>
                      <FiUser className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-600 text-sm font-medium">This is you</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <p className="text-gray-700 mb-6">{teacher?.bio || 'No bio added yet'}</p>

            {/* Skills They Teach with Pricing */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {isOwnProfile ? 'Your Teaching Skills' : 'Skills They Teach'} 💰
              </h2>
              <div className="grid gap-3">
                {teacher?.skillsTeach?.map((skill, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{skill.name}</span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                          {skill.experience || 'Expert'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <FiAward className="w-4 h-4" />
                          {skill.yearsOfExperience || 0} years
                        </span>
                        <span className="flex items-center gap-1">
                          <FiStar className="w-4 h-4 text-yellow-500" />
                          {skill.rating || 'New'}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiClock className="w-4 h-4" />
                          {skill.totalSessions || 0} sessions
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        ${skill.hourlyRate}/hr
                      </div>
                      {/* Hide Book button on own profile */}
                      {!isOwnProfile && (
                        <button
                          onClick={() => {
                            setSelectedSkill(skill);
                            setShowBooking(true);
                          }}
                          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Book Session
                        </button>
                      )}
                      {isOwnProfile && (
                        <div className="mt-2 text-xs text-gray-500">
                          Your rate • Students pay this
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {(!teacher?.skillsTeach || teacher.skillsTeach.length === 0) && (
                  <p className="text-gray-500 text-center py-4">No teaching skills added yet</p>
                )}
              </div>
            </div>

            {/* Skills They Want to Learn */}
            {teacher?.skillsLearn?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  {isOwnProfile ? 'Skills You Want to Learn' : 'Skills They Want to Learn'}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {teacher.skillsLearn.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm"
                    >
                      {skill.name} • {skill.priority} priority • Up to ${skill.budget}/hr
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Booking Modal - only shown for other teachers */}
      {showBooking && selectedSkill && !isOwnProfile && (
        <BookingModal
          teacher={teacher}
          skill={selectedSkill}
          onClose={() => setShowBooking(false)}
          onBooked={() => {
            setShowBooking(false);
            toast.success('Session booked! Complete payment to confirm.');
          }}
        />
      )}
    </div>
  );
};

export default TeacherProfile;
