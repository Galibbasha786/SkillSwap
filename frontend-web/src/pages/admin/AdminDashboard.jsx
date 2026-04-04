// frontend-web/src/pages/admin/AdminDashboard.jsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  FiMail
} from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Manage platform, users, and payments</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Send Notification Button */}
              <button
                onClick={() => setShowNotificationModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md"
              >
                <FiBell className="w-5 h-5" />
                <span className="hidden sm:inline">Send Notification</span>
              </button>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-100"
              >
                <FiLogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Logged in as</p>
                  <p className="font-semibold text-gray-900">{user?.name}</p>
                </div>
                <img 
                  src={user?.profileImage || 'https://via.placeholder.com/40'} 
                  alt="Admin" 
                  className="w-10 h-10 rounded-full border-2 border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon={FiUsers}
            color="blue"
            trend={`${stats?.totalTeachers || 0} Teachers, ${stats?.totalStudents || 0} Students`}
          />
          <StatCard
            title="Total Sessions"
            value={stats?.totalSessions || 0}
            icon={FiBook}
            color="green"
            trend={`${stats?.completedSessions || 0} Completed`}
          />
          <StatCard
            title="Total Revenue"
            value={`₹${(stats?.totalRevenue || 0).toFixed(2)}`}
            icon={FiDollarSign}
            color="purple"
            trend="Platform fees"
          />
          <StatCard
            title="Pending Withdrawals"
            value={`₹${(stats?.pendingWithdrawals || 0).toFixed(2)}`}
            icon={FiClock}
            color="orange"
            trend="Awaiting processing"
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {['overview', 'withdrawals', 'users', 'transactions'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'withdrawals' && withdrawals.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                      {withdrawals.length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <OverviewTab stats={stats} />
            )}
            
            {activeTab === 'withdrawals' && (
              <WithdrawalsTab 
                withdrawals={withdrawals}
                onApprove={handleApproveWithdrawal}
                onComplete={handleCompleteWithdrawal}
                onReject={handleRejectWithdrawal}
              />
            )}
            
            {activeTab === 'users' && (
              <UsersTab />
            )}
            
            {activeTab === 'transactions' && (
              <TransactionsTab />
            )}
          </div>
        </div>
      </div>

      {/* Send Notification Modal */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <FiMail className="w-6 h-6 text-blue-500" />
                <h2 className="text-xl font-bold text-gray-900">Send Notification</h2>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
const StatCard = ({ title, value, icon: Icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
};

// Overview Tab Component
const OverviewTab = ({ stats }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard
          title="Exams Created"
          value={stats?.totalExams || 0}
          icon={FiFileText}
          color="blue"
        />
        <InfoCard
          title="Certificates Issued"
          value={stats?.totalCertificates || 0}
          icon={FiAward}
          color="green"
        />
        <InfoCard
          title="Platform Fee"
          value="10%"
          icon={FiTrendingUp}
          color="purple"
          subtitle="of each transaction"
        />
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Platform Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="space-y-2">
            <p>✓ Teachers earn 90% of session fees</p>
            <p>✓ Platform earns 10% as service fee</p>
          </div>
          <div className="space-y-2">
            <p>✓ Withdrawals processed within 24-48 hours</p>
            <p>✓ Minimum withdrawal amount: ₹100</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Info Card Component
const InfoCard = ({ title, value, icon: Icon, color, subtitle }) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600'
  };
  
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${colorClasses[color]}`} />
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

// Withdrawals Tab Component - COMPLETE VERSION with status badges and message button
const WithdrawalsTab = ({ withdrawals = [], onApprove, onComplete, onReject }) => {
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
      <div className="text-center py-12">
        <FiCheckCircle className="w-16 h-16 mx-auto text-green-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Withdrawal Requests</h3>
        <p className="text-gray-500">All withdrawal requests have been processed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {safeWithdrawals.map((withdrawal) => {
        const status = withdrawal.status || 'pending';
        
        return (
          <div key={withdrawal._id} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
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
const UsersTab = () => {
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
const TransactionsTab = () => {
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
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Session</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Learner</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Teacher</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Platform Fee</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Teacher Earns</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <tr key={transaction._id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-500">
                {new Date(transaction.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {transaction.sessionId?.title || 'N/A'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {transaction.learnerId?.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {transaction.teacherId?.name}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                ₹{transaction.amount}
              </td>
              <td className="px-4 py-3 text-sm text-orange-600">
                ₹{transaction.platformFee}
              </td>
              <td className="px-4 py-3 text-sm text-green-600 font-medium">
                ₹{transaction.teacherEarnings}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
                  transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {transaction.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {transactions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No transactions found
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;