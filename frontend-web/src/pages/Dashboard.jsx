import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { FiLogOut, FiUser, FiBook, FiMessageSquare, FiCalendar } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { FiSearch, FiUsers } from 'react-icons/fi';
const Dashboard = () => {
  const { user, logout } = useAuth();

  const stats = [
    { label: 'Skills Teaching', value: user?.skillsTeach?.length || 0, icon: FiBook, color: 'blue' },
    { label: 'Skills Learning', value: user?.skillsLearn?.length || 0, icon: FiUser, color: 'purple' },
    { label: 'Messages', value: '3', icon: FiMessageSquare, color: 'green' },
    { label: 'Sessions', value: '5', icon: FiCalendar, color: 'orange' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold gradient-text">SkillSwap</h1>
            
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Welcome, {user?.name}</span>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
              >
                <FiLogOut />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h2>
          <p className="text-gray-600 mt-2">
            Ready to learn and share knowledge today?
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full btn-primary">Find a Teacher</button>
              <button className="w-full btn-secondary">Offer to Teach</button>
              <button className="w-full btn-outline">Schedule Session</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Upcoming Sessions</h3>
            <p className="text-gray-500 text-center py-8">No upcoming sessions</p>
          </div>
          <div className="space-y-3">
  <Link to="/marketplace">
    <button className="w-full btn-primary flex items-center justify-center gap-2">
      <FiSearch />
      Browse Skill Marketplace
    </button>
  </Link>
  <Link to="/matches">
    <button className="w-full btn-secondary flex items-center justify-center gap-2">
      <FiUsers />
      View Your Matches
    </button>
  </Link>
  <button className="w-full btn-outline">Schedule Session</button>
</div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;