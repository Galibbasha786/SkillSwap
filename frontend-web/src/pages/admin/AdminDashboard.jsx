// frontend-web/src/pages/admin/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, 
  FiBook, 
  FiDollarSign, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle,
  FiTrendingUp,
  FiLoader,
  FiUserCheck,
  FiUserX,
  FiAward,
  FiFileText,
  FiCalendar,
  FiPlus,
  FiSearch,
  FiLogOut,
  FiBell,
  FiSend,
  FiMail,
  FiSun,
  FiMoon
} from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import skillswapLogo from '../../assets/skillswaplogo.jpg';
import { loadAdminPreferences, saveAdminPreferences } from '../../utils/adminTheme';

const AdminBackground = ({ isDark }) => (
  <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
    <div className={`absolute inset-0 ${isDark ? 'bg-[#0f1419]' : 'bg-[#f8fafc]'}`} />
    {/* Single centered circular logo watermark */}
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className={`relative flex items-center justify-center rounded-full ${
          isDark ? 'opacity-[0.07]' : 'opacity-[0.09]'
        }`}
        style={{ width: 'min(480px, 70vw)', height: 'min(480px, 70vw)' }}
      >
        <div
          className={`absolute inset-0 rounded-full border-[14px] ${
            isDark ? 'border-white/10' : 'border-slate-300/40'
          }`}
        />
        <div className="absolute inset-[14px] rounded-full overflow-hidden">
          <img
            src={skillswapLogo}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        </div>
      </div>
    </div>
  </div>
);

const ThemeControls = ({ mode, onModeChange, isDark }) => (
  <div className="flex items-center rounded-lg border p-0.5 bg-transparent">
    <div
      className={`flex rounded-md overflow-hidden border ${
        isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
      }`}
    >
      {[
        { id: 'light', icon: FiSun, label: 'Light' },
        { id: 'dark', icon: FiMoon, label: 'Dark' },
      ].map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onModeChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === id
              ? isDark
                ? 'bg-slate-700 text-white'
                : 'bg-slate-900 text-white'
              : isDark
                ? 'text-slate-400 hover:text-white'
                : 'text-slate-500 hover:text-slate-900'
          }`}
          title={label}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('info');
  const [sendingNotification, setSendingNotification] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [themePrefs, setThemePrefs] = useState(loadAdminPreferences);
  const isDark = themePrefs.mode === 'dark';

  useEffect(() => {
    saveAdminPreferences(themePrefs);
  }, [themePrefs]);

  const setMode = (mode) => setThemePrefs((p) => ({ ...p, mode }));

  const surface = isDark
    ? 'bg-[#161b22]/95 border-slate-800'
    : 'bg-white/95 border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-500';

  // Check if user is admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Access denied. Admin privileges required.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, withdrawalsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getPendingWithdrawals()
      ]);
      
      console.log('Withdrawals response:', withdrawalsRes.data);
      
      // Handle different response structures
      let withdrawalsData = [];
      if (withdrawalsRes.data) {
        if (Array.isArray(withdrawalsRes.data)) {
          withdrawalsData = withdrawalsRes.data;
        } else if (withdrawalsRes.data.withdrawals && Array.isArray(withdrawalsRes.data.withdrawals)) {
          withdrawalsData = withdrawalsRes.data.withdrawals;
        }
      }
      
      setStats(statsRes.data.stats);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const handleSendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast.error('Please enter both title and message');
      return;
    }

    setSendingNotification(true);
    try {
      await adminAPI.sendNotificationToAll({
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType
      });
      toast.success('Notification sent to all users successfully!');
      setShowNotificationModal(false);
      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationType('info');
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleApproveWithdrawal = async (id) => {
    try {
      await adminAPI.approveWithdrawal(id);
      toast.success('Withdrawal approved and is now processing');
      fetchData();
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      toast.error(error.response?.data?.message || 'Failed to approve withdrawal');
    }
  };

  const handleCompleteWithdrawal = async (id) => {
    const transactionId = prompt('Enter transaction ID/reference number:');
    if (!transactionId) return;
    
    try {
      await adminAPI.completeWithdrawal(id, { transactionId });
      toast.success('Withdrawal marked as completed! User will be notified.');
      fetchData();
    } catch (error) {
      console.error('Error completing withdrawal:', error);
      toast.error(error.response?.data?.message || 'Failed to complete withdrawal');
    }
  };

  const handleRejectWithdrawal = async (id) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    
    try {
      await adminAPI.rejectWithdrawal(id, { reason });
      toast.success('Withdrawal rejected. User will be notified.');
      fetchData();
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      toast.error(error.response?.data?.message || 'Failed to reject withdrawal');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center relative ${isDark ? 'bg-[#0f1419]' : 'bg-[#f8fafc]'}`}>
        <AdminBackground isDark={isDark} />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-300/50 shadow-sm">
            <img src={skillswapLogo} alt="SkillSwap" className="w-full h-full object-cover" />
          </div>
          <FiLoader className={`w-6 h-6 animate-spin ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <p className={`text-sm ${textMuted}`}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      <AdminBackground isDark={isDark} />

      {/* Header */}
      <header className={`sticky top-0 z-20 border-b backdrop-blur-md ${surface}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={skillswapLogo}
                alt="SkillSwap"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <h1 className={`text-lg font-semibold truncate ${textPrimary}`}>Admin Dashboard</h1>
                <p className={`text-xs truncate ${textMuted}`}>Platform management</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <ThemeControls mode={themePrefs.mode} onModeChange={setMode} isDark={isDark} />
              <button
                type="button"
                onClick={() => setShowNotificationModal(true)}
                className={`hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <FiBell className="w-4 h-4" />
                Notify
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className={`p-2 rounded-lg transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                title="Logout"
              >
                <FiLogOut className="w-5 h-5" />
              </button>
              <div className={`hidden md:flex items-center gap-2 pl-3 border-l ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <span className={`text-sm font-medium ${textPrimary}`}>{user?.name}</span>
                <img src={skillswapLogo} alt="" className="w-8 h-8 rounded-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={FiUsers} trend={`${stats?.totalTeachers || 0} teachers · ${stats?.totalStudents || 0} students`} isDark={isDark} />
          <StatCard title="Sessions" value={stats?.totalSessions || 0} icon={FiBook} trend={`${stats?.completedSessions || 0} completed`} isDark={isDark} />
          <StatCard title="Revenue" value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`} icon={FiDollarSign} trend="10% platform fee" isDark={isDark} />
          <StatCard title="Pending Withdrawals" value={`₹${(stats?.pendingWithdrawals || 0).toFixed(2)}`} icon={FiClock} trend="Needs review" isDark={isDark} highlight />
        </div>

        <div className={`rounded-xl border shadow-sm overflow-hidden ${surface}`}>
          <nav className={`flex border-b overflow-x-auto ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            {['overview', 'withdrawals', 'users', 'transactions'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3.5 text-sm font-medium capitalize whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? isDark
                      ? 'border-blue-500 text-blue-400'
                      : 'border-slate-900 text-slate-900'
                    : isDark
                      ? 'border-transparent text-slate-500 hover:text-slate-300'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
                {tab === 'withdrawals' && withdrawals.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold rounded-full bg-red-500 text-white">
                    {withdrawals.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && <OverviewTab stats={stats} isDark={isDark} />}
                {activeTab === 'withdrawals' && (
                  <WithdrawalsTab withdrawals={withdrawals} onApprove={handleApproveWithdrawal} onComplete={handleCompleteWithdrawal} onReject={handleRejectWithdrawal} isDark={isDark} />
                )}
                {activeTab === 'users' && <UsersTab isDark={isDark} />}
                {activeTab === 'transactions' && <TransactionsTab isDark={isDark} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            className={`rounded-2xl max-w-md w-full p-6 shadow-2xl border ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FiMail className="w-6 h-6 text-blue-500" />
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Send Notification</h2>
              </div>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiXCircle className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              This notification will be sent to ALL users of the platform.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notification Type
              </label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark ? 'bg-slate-800 border-slate-600 text-white' : 'border-gray-300'
                }`}
              >
                <option value="info">ℹ️ Information</option>
                <option value="success">✅ Success</option>
                <option value="warning">⚠️ Warning</option>
                <option value="error">❌ Error</option>
                <option value="announcement">📢 Announcement</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                placeholder="e.g., Platform Update, New Feature, etc."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark ? 'bg-slate-800 border-slate-600 text-white' : 'border-gray-300'
                }`}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                rows="4"
                placeholder="Enter your notification message here..."
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                  isDark ? 'bg-slate-800 border-slate-600 text-white' : 'border-gray-300'
                }`}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700">
                ⚡ This notification will be sent to all users immediately.
                They will receive it in their notification center.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowNotificationModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNotification}
                disabled={sendingNotification}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isDark ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {sendingNotification ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    Send Notification
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, trend, isDark, highlight = false }) => (
  <div
    className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${
      isDark
        ? `bg-[#161b22]/90 border-slate-800 ${highlight ? 'ring-1 ring-amber-500/30' : ''}`
        : `bg-white/95 border-slate-200 ${highlight ? 'ring-1 ring-amber-400/40' : ''}`
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          {title}
        </p>
        <p className={`text-2xl font-semibold mt-1 truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {value}
        </p>
        {trend && (
          <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{trend}</p>
        )}
      </div>
      <div
        className={`shrink-0 p-2.5 rounded-lg ${
          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

// Overview Tab Component
const OverviewTab = ({ stats, isDark }) => (
  <div className="space-y-5">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <InfoCard title="Exams Created" value={stats?.totalExams || 0} icon={FiFileText} isDark={isDark} />
      <InfoCard title="Certificates Issued" value={stats?.totalCertificates || 0} icon={FiAward} isDark={isDark} />
      <InfoCard title="Platform Fee" value="10%" icon={FiTrendingUp} subtitle="per transaction" isDark={isDark} />
    </div>
    <div
      className={`rounded-lg border p-5 text-sm leading-relaxed ${
        isDark ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}
    >
      <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>Platform policies</h3>
      <ul className="grid md:grid-cols-2 gap-2 list-disc list-inside marker:text-slate-400">
        <li>Teachers earn 90% of session fees</li>
        <li>Platform retains 10% service fee</li>
        <li>Withdrawals processed within 24–48 hours</li>
        <li>Minimum withdrawal: ₹100</li>
      </ul>
    </div>
  </div>
);

// Info Card Component
const InfoCard = ({ title, value, icon: Icon, subtitle, isDark }) => (
  <div
    className={`rounded-lg border p-4 ${
      isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-md ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{title}</p>
        <p className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
        {subtitle && <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{subtitle}</p>}
      </div>
    </div>
  </div>
);

// Withdrawals Tab Component - COMPLETE VERSION with status badges and message button
const WithdrawalsTab = ({ withdrawals = [], onApprove, onComplete, onReject, isDark = false }) => {
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  const getStatusBadge = (status) => {
    if (status === 'pending') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">⏳ Pending Approval</span>;
    }
    if (status === 'processing') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">🔄 Processing</span>;
    }
    if (status === 'success' || status === 'completed') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✅ Completed</span>;
    }
    if (status === 'rejected' || status === 'failed') {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">❌ Rejected</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{status || 'Unknown'}</span>;
  };

  const handleSendMessage = async (withdrawalId) => {
    if (!messageContent.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSendingMessage(true);
    try {
      await adminAPI.sendWithdrawalMessage(withdrawalId, {
        subject: messageSubject || 'Update on Your Withdrawal',
        message: messageContent
      });
      toast.success('Message sent to user');
      setShowMessageModal(false);
      setMessageContent('');
      setMessageSubject('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Ensure withdrawals is an array
  const safeWithdrawals = Array.isArray(withdrawals) ? withdrawals : [];

  if (safeWithdrawals.length === 0) {
    return (
      <div className="text-center py-16">
        <FiCheckCircle className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`} />
        <h3 className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>No pending withdrawals</h3>
        <p className={`text-sm mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>All requests have been processed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {safeWithdrawals.map((withdrawal) => {
        const status = withdrawal.status || 'pending';
        
        return (
          <div
            key={withdrawal._id}
            className={`border rounded-lg p-4 transition-colors ${
              isDark ? 'border-slate-700 bg-slate-800/30 hover:border-slate-600' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <img 
                    src={withdrawal.userId?.profileImage || 'https://via.placeholder.com/40'} 
                    alt={withdrawal.userId?.name}
                    className="w-10 h-10 rounded-full"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{withdrawal.userId?.name || 'Unknown User'}</p>
                    <p className="text-sm text-gray-500">{withdrawal.userId?.email || ''}</p>
                  </div>
                  <div className="ml-auto">
                    {getStatusBadge(status)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Amount</p>
                    <p className="text-lg font-bold text-green-600">₹{withdrawal.amount || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Method</p>
                    <p className="text-sm font-medium text-gray-700">
                      {withdrawal.paymentMethod === 'upi' ? 'UPI' : withdrawal.paymentMethod === 'bank' ? 'Bank Transfer' : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Requested</p>
                    <p className="text-sm text-gray-700">
                      {withdrawal.createdAt ? new Date(withdrawal.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Details</p>
                    {withdrawal.paymentMethod === 'upi' ? (
                      <p className="text-sm font-mono text-gray-700">{withdrawal.upiId || 'N/A'}</p>
                    ) : (
                      <p className="text-sm text-gray-700">
                        {withdrawal.bankInfo?.bankName || 'N/A'} - ****{withdrawal.bankInfo?.accountNumber?.slice(-4) || '****'}
                      </p>
                    )}
                  </div>
                </div>

                {status === 'processing' && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700 flex items-center gap-1">
                      <FiLoader className="animate-spin w-3 h-3" />
                      Payment is being processed. Enter transaction ID after sending funds.
                    </p>
                  </div>
                )}

                {withdrawal.rejectionReason && status === 'rejected' && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-red-700 font-medium">Rejection Reason:</p>
                    <p className="text-sm text-red-600">{withdrawal.rejectionReason}</p>
                  </div>
                )}

                {withdrawal.transactionId && status === 'success' && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700 font-medium">Transaction ID:</p>
                    <p className="text-sm font-mono text-green-600">{withdrawal.transactionId}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 ml-4">
                {status === 'pending' && (
                  <>
                    <button
                      onClick={() => onApprove && onApprove(withdrawal._id)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      Approve & Process
                    </button>
                    <button
                      onClick={() => onReject && onReject(withdrawal._id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}
                
                {status === 'processing' && (
                  <button
                    onClick={() => onComplete && onComplete(withdrawal._id)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                  >
                    Mark as Completed
                  </button>
                )}

                {/* Send Message Button - Always visible */}
                <button
                  onClick={() => {
                    setSelectedWithdrawal(withdrawal);
                    setShowMessageModal(true);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
                >
                  <FiMail className="inline mr-1 w-4 h-4" />
                  Message
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Send Message Modal */}
      {showMessageModal && selectedWithdrawal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Send Message to {selectedWithdrawal.userId?.name || 'User'}
              </h2>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiXCircle className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Withdrawal: ₹{(selectedWithdrawal.amount || 0).toLocaleString()} ({selectedWithdrawal.status || 'pending'})
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject (Optional)
              </label>
              <input
                type="text"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="e.g., Update on your withdrawal"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows="5"
                placeholder="Enter your message here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendMessage(selectedWithdrawal._id)}
                disabled={sendingMessage}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
              >
                {sendingMessage ? (
                  <span className="flex items-center justify-center gap-2">
                    <FiLoader className="animate-spin w-4 h-4" />
                    Sending...
                  </span>
                ) : (
                  'Send Message'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Users Tab Component
const UsersTab = ({ isDark = false }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter, dateFrom, dateTo, page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { 
        search, 
        role: roleFilter, 
        status: statusFilter,
        dateFrom,
        dateTo,
        page, 
        limit: 10000 // Show all users
      };
      const response = await adminAPI.getUsers(params);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, isActive) => {
    try {
      await adminAPI.updateUserStatus(userId, { isActive: !isActive });
      toast.success(`User ${!isActive ? 'activated' : 'suspended'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Search & Filter Users</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="teacher">Teachers</option>
            <option value="student">Students</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="From date"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="To date"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setSearch('');
              setRoleFilter('all');
              setStatusFilter('all');
              setDateFrom('');
              setDateTo('');
              setPage(1);
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Wallet</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Joined</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
  <div 
    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg"
    onClick={() => navigate(`/admin/users/${user._id}`)}
  >
    <img 
      src={user.profileImage || 'https://via.placeholder.com/40'} 
      alt={user.name}
      className="w-10 h-10 rounded-full"
    />
    <div>
      <p className="font-medium text-gray-900">{user.name}</p>
      <p className="text-sm text-gray-500">{user.email}</p>
    </div>
  </div>
</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.skillsTeach?.length > 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 
                     user.skillsTeach?.length > 0 ? 'Teacher' : 'Student'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.isActive ? 'Active' : 'Suspended'}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  ₹{user.wallet?.balance?.toFixed(2) || 0}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateUserStatus(user._id, user.isActive)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        user.isActive 
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {user.isActive ? 'Suspend' : 'Activate'}
                    </button>
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => deleteUser(user._id)}
                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {users.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No users found
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Transactions Tab Component
const TransactionsTab = ({ isDark = false }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getTransactions();
      setTransactions(response.data.transactions);
    } catch (error) {
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className={isDark ? 'bg-slate-800/80' : 'bg-gray-50'}>
          <tr>
            <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</th>
            <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Session</th>
            <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Learner</th>
            <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Teacher</th>
            <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Amount</th>
            <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Platform Fee</th>
            <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Teacher Earns</th>
            <th className={`px-4 py-3 text-left text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-200'}`}>
          {transactions.map((transaction) => (
            <tr
              key={transaction._id}
              className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}
            >
              <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {new Date(transaction.createdAt).toLocaleDateString()}
              </td>
              <td className={`px-4 py-3 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {transaction.sessionId?.title || 'N/A'}
              </td>
              <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                {transaction.learnerId?.name}
              </td>
              <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>
                {transaction.teacherId?.name}
              </td>
              <td className={`px-4 py-3 text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                ₹{transaction.amount}
              </td>
              <td className="px-4 py-3 text-sm text-orange-500">
                ₹{transaction.platformFee}
              </td>
              <td className="px-4 py-3 text-sm text-green-500 font-medium">
                ₹{transaction.teacherEarnings}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  transaction.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {transaction.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {transactions.length === 0 && (
        <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          No transactions found
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;