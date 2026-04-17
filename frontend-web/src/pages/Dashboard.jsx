// frontend-web/src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import ImageUpload from '../components/profile/ImageUpload';
import NotificationBell from '../components/common/NotificationBell';
import ThemeToggle from '../components/common/ThemeToggle';
import WalletBalance from '../components/wallet/WalletBalance';
import RatingModal from '../components/ratings/RatingModal';
import RewardsCard from '../components/rewards/RewardsCard';
import { 
  FiLogOut, 
  FiUser, 
  FiBook, 
  FiMessageSquare, 
  FiCalendar,
  FiSearch,
  FiUsers,
  FiDollarSign,
  FiStar,
  FiClock,
  FiAward,
  FiVideo,
  FiCheckCircle,
  FiHome,
  FiSettings,
  FiMenu,
  FiX,
  FiHeart,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';
import AddTeachingSkill from '../components/skills/AddTeachingSkill';
import AddLearningSkill from '../components/skills/AddLearningSkill';
import { userAPI, sessionAPI, ratingAPI } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user, logout, getUserId } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [completedSessions, setCompletedSessions] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Rating Modal State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [ratingRole, setRatingRole] = useState(null);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const userId = getUserId();
      if (userId) {
        await Promise.all([
          fetchUserData(userId),
          fetchSessions()
        ]);
      } else {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            const id = parsedUser.id || parsedUser._id;
            if (id) {
              await Promise.all([
                fetchUserData(id),
                fetchSessions()
              ]);
            }
          } catch (e) {
            console.error('Error parsing saved user:', e);
          }
        }
      }
    };
    
    fetchData();
  }, [refresh]);

  const fetchUserData = async (userId) => {
    try {
      if (!userId) {
        console.error('No user ID available');
        return;
      }
      console.log('Fetching profile for user ID:', userId);
      const response = await userAPI.getProfile(userId);
      console.log('Profile data:', response.data);
      setUserData(response.data);
      setProfileImage(response.data.profileImage);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    }
  };

  const fetchSessions = async () => {
    try {
      const response = await sessionAPI.getAll();
      const allSessions = response.data || [];
      
      const now = new Date();
      const upcoming = allSessions.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate > now && 
               session.status !== 'completed' && 
               session.status !== 'cancelled';
      });
      
      const completed = allSessions.filter(session => {
        return session.status === 'completed';
      });
      
      setUpcomingSessions(upcoming);
      setCompletedSessions(completed);
      
      console.log('Upcoming sessions:', upcoming.length);
      console.log('Completed sessions:', completed.length);
      
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleSkillAdded = () => {
    setRefresh(!refresh);
    toast.success('Skill added successfully!');
  };

  const getTeacherProfileId = () => {
    return (
      userData?._id || 
      userData?.id || 
      user?.id || 
      user?._id || 
      JSON.parse(localStorage.getItem('user') || '{}').id ||
      JSON.parse(localStorage.getItem('user') || '{}')._id
    );
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const handleImageUpdate = (newImage) => {
    console.log('🖼️ Image updated:', newImage);
    setProfileImage(newImage);
    setUserData(prev => ({ ...prev, profileImage: newImage }));
    
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      parsedUser.profileImage = newImage;
      localStorage.setItem('user', JSON.stringify(parsedUser));
    }
    
    toast.success('Profile image updated!');
  };

  const handleImageRemove = () => {
    const defaultImage = 'https://via.placeholder.com/150';
    setProfileImage(defaultImage);
    setUserData(prev => ({ ...prev, profileImage: defaultImage }));
    
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      parsedUser.profileImage = defaultImage;
      localStorage.setItem('user', JSON.stringify(parsedUser));
    }
  };

  const handleJoinMeet = (meetLink) => {
    window.open(meetLink, '_blank');
  };

  // Rating Functions
  const handleRateClick = async (session) => {
    try {
      const response = await ratingAPI.canRateSession(session._id);
      if (response.data.canRate) {
        setSelectedSession(session);
        setRatingRole(response.data.role);
        setShowRatingModal(true);
      } else if (response.data.alreadyRated) {
        toast.error('You have already rated this session');
      } else {
        toast.error('Cannot rate this session');
      }
    } catch (error) {
      console.error('Error checking rating eligibility:', error);
      toast.error('Cannot rate this session');
    }
  };

  const handleRatingSubmitted = () => {
    fetchSessions();
    toast.success('Thank you for your feedback!');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const stats = [
    { 
      label: 'Teaching Skills', 
      value: userData?.skillsTeach?.length || 0, 
      icon: FiBook, 
      color: 'blue',
      details: userData?.skillsTeach?.map(s => `${s.name} (₹${s.hourlyRate}/hr)`).join(', ') 
    },
    { 
      label: 'Learning Goals', 
      value: userData?.skillsLearn?.length || 0, 
      icon: FiUser, 
      color: 'purple',
      details: userData?.skillsLearn?.map(s => `${s.name} (₹${s.budget}/hr)`).join(', ')
    },
    { 
      label: 'Upcoming', 
      value: upcomingSessions.length || 0, 
      icon: FiCalendar, 
      color: 'green' 
    },
    { 
      label: 'Completed', 
      value: completedSessions.length || 0, 
      icon: FiCheckCircle, 
      color: 'orange' 
    },
  ];

  const teacherId = getTeacherProfileId();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar Toggle Button - Always visible on mobile, on desktop it's at the edge */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors ${
          isMobile ? 'left-4' : (sidebarOpen ? 'left-72' : 'left-4')
        }`}
      >
        {sidebarOpen ? <FiChevronLeft className="w-5 h-5" /> : <FiChevronRight className="w-5 h-5" />}
      </button>

      {/* Sidebar Overlay for mobile */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-72`}
      >
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            SkillSwap
          </h1>
          <p className="text-xs text-gray-500 mt-1">Learn. Share. Grow.</p>
        </div>

        <div className="p-4">
          {/* User Info - Clickable to go to profile */}
          <div 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <img
              src={profileImage || userData?.profileImage || 'https://via.placeholder.com/40'}
              alt={userData?.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900 text-sm truncate">{userData?.name || user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{userData?.email || user?.email}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <Link
              to="/dashboard"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-blue-600 bg-blue-50"
            >
              <FiHome className="w-5 h-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            <Link
              to="/marketplace"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiSearch className="w-5 h-5" />
              <span className="text-sm font-medium">Marketplace</span>
            </Link>
            <Link
              to="/matches"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiUsers className="w-5 h-5" />
              <span className="text-sm font-medium">Your Matches</span>
            </Link>
            <Link
              to="/mutual-matches"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiHeart className="w-5 h-5" />
              <span className="text-sm font-medium">Free Skill Swaps</span>
            </Link>
            <Link
              to="/sessions"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiCalendar className="w-5 h-5" />
              <span className="text-sm font-medium">My Sessions</span>
            </Link>
            <Link
              to="/messages"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiMessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">Messages</span>
            </Link>
            <Link
              to="/exams"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiBook className="w-5 h-5" />
              <span className="text-sm font-medium">Exams</span>
            </Link>
            <Link
              to="/teacher/exams"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiCheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">My Exams</span>
            </Link>
            <Link
              to="/profile"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiUser className="w-5 h-5" />
              <span className="text-sm font-medium">My Profile</span>
            </Link>
            <Link
              to="/settings"
              onClick={() => isMobile && setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <FiSettings className="w-5 h-5" />
              <span className="text-sm font-medium">Settings</span>
            </Link>
          </nav>
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <FiLogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
        {/* Header */}
        <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-end items-center gap-4">
              <NotificationBell />
              <ThemeToggle />
              <ImageUpload
  currentImage={profileImage}
  onImageUpdate={handleImageUpdate}
  onImageRemove={handleImageRemove}
  size="small"
/>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <span className="hidden sm:inline font-medium text-sm">
                  {userData?.name || user?.name}
                </span>
                <FiUser className="w-5 h-5" />
              </button>
            </div>
          </div>
        </nav>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Welcome back, {userData?.name || user?.name}! 👋
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Ready to learn and share knowledge today?
            </p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 bg-${stat.color}-100 rounded-lg group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.details && (
                    <p className="text-xs text-gray-500 mt-2 truncate" title={stat.details}>
                      {stat.details}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
            
            {/* Wallet Card */}
            <WalletBalance />
            <div className="col-span-1">
  <RewardsCard />
</div>
          </div>

          {/* Rest of your dashboard content remains the same */}
          {/* Add Skills Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Teaching Skills */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiBook className="text-blue-500" />
                Skills You Teach <span className="text-sm text-gray-500">(Earn money)</span>
              </h3>
              
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {userData?.skillsTeach?.map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{skill.name}</span>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <FiAward className="w-3 h-3" />
                          {skill.experience}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {skill.yearsOfExperience}yrs
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">₹{skill.hourlyRate}/hr</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <AddTeachingSkill 
                onAdd={handleSkillAdded} 
                existingSkills={userData?.skillsTeach} 
              />
            </motion.div>

            {/* Learning Skills */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiUser className="text-purple-500" />
                Skills You Want to Learn <span className="text-sm text-gray-500">(Set budget)</span>
              </h3>
              
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {userData?.skillsLearn?.map((skill, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{skill.name}</span>
                      <div className="flex mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          skill.priority === 'High' ? 'bg-red-100 text-red-600' :
                          skill.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {skill.priority} Priority
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-purple-600">₹{skill.budget}/hr</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <AddLearningSkill 
                onAdd={handleSkillAdded} 
                existingSkills={userData?.skillsLearn} 
              />
            </motion.div>
          </div>

          {/* Sessions Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Upcoming Sessions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">📅 Upcoming Sessions</h3>
                {upcomingSessions.length > 0 && (
                  <Link to="/sessions" className="text-sm text-blue-500 hover:text-blue-600">
                    View all
                  </Link>
                )}
              </div>
              
              {upcomingSessions.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {upcomingSessions.slice(0, 3).map((session) => {
                    const { date, time } = formatDateTime(session.date);
                    const canJoin = new Date(session.date) <= new Date();
                    
                    return (
                      <div key={session._id} className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{session.title}</p>
                            <p className="text-sm text-gray-600">
                              with {session.teacherId?.name || session.learnerId?.name}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-blue-500 text-white rounded-full">
                            {date}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <FiClock className="w-3 h-3" />
                            {time}
                          </div>
                          {canJoin && session.meetLink && (
                            <button
                              onClick={() => handleJoinMeet(session.meetLink)}
                              className="text-xs bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 flex items-center gap-1"
                            >
                              <FiVideo className="w-3 h-3" />
                              Join Meet
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No upcoming sessions</p>
                  <Link to="/marketplace">
                    <button className="mt-4 text-blue-500 hover:text-blue-600 text-sm font-medium">
                      Find a teacher →
                    </button>
                  </Link>
                </div>
              )}
            </motion.div>

            {/* Completed Sessions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-md p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">✅ Completed Sessions</h3>
                {completedSessions.length > 0 && (
                  <Link to="/sessions?filter=completed" className="text-sm text-blue-500 hover:text-blue-600">
                    View all
                  </Link>
                )}
              </div>
              
              {completedSessions.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {completedSessions.slice(0, 3).map((session) => {
                    const userId = getUserId() || user?.id || user?._id;
                    const hasRated = (session.teacherRating?.givenBy === userId && session.teacherRating?.rating) ||
                                     (session.learnerRating?.givenBy === userId && session.learnerRating?.rating);
                    const isTeacher = session.teacherId?._id === userId;
                    const otherPerson = isTeacher ? session.learnerId : session.teacherId;
                    
                    return (
                      <div key={session._id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{session.title}</p>
                            <p className="text-sm text-gray-600">
                              with {otherPerson?.name}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">
                            Completed
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(session.date).toLocaleDateString()}
                        </p>
                        
                        {!hasRated ? (
                          <button
                            onClick={() => handleRateClick(session)}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-yellow-600 hover:to-orange-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <FiStar className="w-4 h-4" />
                            Rate {isTeacher ? 'Student' : 'Teacher'}
                          </button>
                        ) : (
                          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-500">
                            <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>You rated this session</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiCheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No completed sessions yet</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            <Link to="/marketplace">
              <button className="w-full p-4 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex flex-col items-center gap-2">
                <FiSearch className="w-6 h-6" />
                <span className="text-sm">Find Teacher</span>
              </button>
            </Link>
            
            <Link to="/teacher/exams/create">
              <button className="w-full p-4 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex flex-col items-center gap-2">
                <FiBook className="w-6 h-6" />
                <span className="text-sm">Create Exam</span>
              </button>
            </Link>

            <Link to="/teacher/exams">
              <button className="w-full p-4 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors flex flex-col items-center gap-2">
                <FiCheckCircle className="w-6 h-6" />
                <span className="text-sm">My Exams</span>
              </button>
            </Link>
            
            <Link to="/mutual-matches">
              <button className="w-full p-4 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors flex flex-col items-center gap-2">
                <FiUsers className="w-6 h-6" />
                <span className="text-sm">Free Skill Swaps</span>
              </button>
            </Link>
            
            <Link to="/exams">
              <button className="w-full p-4 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex flex-col items-center gap-2">
                <FiAward className="w-6 h-6" />
                <span className="text-sm">Certifications</span>
              </button>
            </Link>
            
            <Link to="/matches">
              <button className="w-full p-4 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-colors flex flex-col items-center gap-2">
                <FiUsers className="w-6 h-6" />
                <span className="text-sm">Your Matches</span>
              </button>
            </Link>

            <Link to="/sessions">
              <button className="w-full p-4 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-colors flex flex-col items-center gap-2">
                <FiCalendar className="w-6 h-6" />
                <span className="text-sm">All Sessions</span>
              </button>
            </Link>
            
            <Link to="/messages">
              <button className="w-full p-4 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors flex flex-col items-center gap-2">
                <FiMessageSquare className="w-6 h-6" />
                <span className="text-sm">Messages</span>
              </button>
            </Link>
          </motion.div>

          {/* Teacher Profile Preview */}
          {userData?.skillsTeach?.length > 0 && teacherId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">Your Teacher Profile is Live! 🎉</h3>
                  <p className="text-blue-100 mb-4">
                    Students can find you and book sessions
                  </p>
                  <Link to={`/teacher/${teacherId}`}>
                    <button className="bg-white text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium">
                      View Your Public Profile
                    </button>
                  </Link>
                </div>
                <div className="hidden md:block">
                  <FiUsers className="w-16 h-16 text-white/30" />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Rating Modal */}
      {showRatingModal && selectedSession && (
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          session={selectedSession}
          role={ratingRole}
          onRatingSubmitted={handleRatingSubmitted}
        />
      )}
    </div>
  );
};

export default Dashboard;