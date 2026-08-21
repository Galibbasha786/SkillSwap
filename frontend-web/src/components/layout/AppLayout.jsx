// frontend-web/src/components/layout/AppLayout.jsx

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FiLogOut,
  FiUser,
  FiBook,
  FiMessageSquare,
  FiCalendar,
  FiSearch,
  FiUsers,
  FiCheckCircle,
  FiHome,
  FiSettings,
  FiHeart,
  FiChevronLeft,
  FiChevronRight,
  FiCode,
  FiGlobe,
  FiFileText
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import NotificationBell from '../common/NotificationBell';
import ThemeToggle from '../common/ThemeToggle';
import BrandMarquee from '../common/BrandMarquee';
import { userAPI } from '../../services/api';
import skillswapLogo from '../../assets/skillswaplogo.jpg';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: FiHome },
  { to: '/marketplace', label: 'Marketplace', icon: FiSearch },
  { to: '/mutual-matches', label: 'Free Skill Swaps', icon: FiHeart },
  { to: '/sessions', label: 'My Sessions', icon: FiCalendar },
  { to: '/messages', label: 'Messages', icon: FiMessageSquare },
  { to: '/posts', label: 'Community', icon: FiGlobe },
  { to: '/resume-builder', label: 'Resume Builder', icon: FiFileText },
  { to: '/compiler', label: 'Online Compiler', icon: FiCode },
  { to: '/exams', label: 'Exams', icon: FiBook },
  { to: '/teacher/exams', label: 'My Exams', icon: FiCheckCircle },
  { to: '/profile', label: 'My Profile', icon: FiUser },
  { to: '/settings', label: 'Settings', icon: FiSettings }
];

const AppLayout = ({ children }) => {
  const { user, logout, getUserId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      setSidebarOpen(window.innerWidth >= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const userId = getUserId();
      if (!userId) return;
      try {
        const response = await userAPI.getProfile(userId);
        setUserData(response.data);
      } catch (_) {
        // optional profile load
      }
    };
    fetchProfile();
  }, [getUserId]);

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const profileImage = userData?.profileImage || user?.profileImage;

  return (
    <div className="min-h-screen bg-gray-50">
      <button
        type="button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors ${
          isMobile ? 'left-4' : sidebarOpen ? 'left-72' : 'left-4'
        }`}
      >
        {sidebarOpen ? <FiChevronLeft className="w-5 h-5" /> : <FiChevronRight className="w-5 h-5" />}
      </button>

      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-72`}
      >
        <div className="p-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <img
              src={skillswapLogo}
              alt="SkillSwap logo"
              className="w-11 h-11 rounded-xl object-cover shadow-sm ring-2 ring-indigo-100 group-hover:ring-indigo-200 transition-all"
            />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                SkillSwap
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Learn. Share. Grow.</p>
            </div>
          </Link>
        </div>

        <div className="p-4 pb-24 overflow-y-auto h-[calc(100vh-5rem)]">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl w-full text-left hover:bg-gray-100 transition-colors"
          >
            <img
              src={profileImage || 'https://via.placeholder.com/40'}
              alt={userData?.name || user?.name || 'Profile'}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{userData?.name || user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{userData?.email || user?.email}</p>
            </div>
          </button>

          <nav className="space-y-1">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => isMobile && setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive(to)
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <FiLogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-0'}`}>
        <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between gap-3">
              <BrandMarquee className="hidden md:flex flex-1 min-w-0 max-w-2xl" />

              <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-auto">
              <Link
                to="/posts"
                title="Community Board"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/posts')
                    ? 'bg-sky-50 text-sky-600'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <FiGlobe className="w-5 h-5" />
                <span className="hidden md:inline">Community</span>
              </Link>
              <Link
                to="/compiler"
                title="Online Compiler"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/compiler')
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <FiCode className="w-5 h-5" />
                <span className="hidden md:inline">Compiler</span>
              </Link>
              <Link
                to="/messages"
                title="Messages"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/messages')
                    ? 'bg-green-50 text-green-600'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <FiMessageSquare className="w-5 h-5" />
                <span className="hidden md:inline">Messages</span>
              </Link>
              <NotificationBell />
              <ThemeToggle />
              <button
                type="button"
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
          </div>

          <BrandMarquee className="md:hidden border-t border-indigo-100/80 dark:border-gray-700 bg-gradient-to-r from-blue-50/80 via-white/80 to-purple-50/80 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 py-2" />
        </nav>

        {children}
      </main>
    </div>
  );
};

export default AppLayout;
