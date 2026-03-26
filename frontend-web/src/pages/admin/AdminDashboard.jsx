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
  FiSearch
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
  const { user } = useAuth();
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
      setStats(statsRes.data.stats);
      setWithdrawals(withdrawalsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveWithdrawal = async (id) => {
    try {
      await adminAPI.approveWithdrawal(id);
      toast.success('Withdrawal approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve withdrawal');
    }
  };

  const handleCompleteWithdrawal = async (id) => {
    const transactionId = prompt('Enter transaction ID/reference number:');
    if (!transactionId) return;
    
    try {
      await adminAPI.completeWithdrawal(id, { transactionId });
      toast.success('Withdrawal marked as completed');
      fetchData();
    } catch (error) {
      toast.error('Failed to complete withdrawal');
    }
  };

  const handleRejectWithdrawal = async (id) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    
    try {
      await adminAPI.rejectWithdrawal(id, { reason });
      toast.success('Withdrawal rejected');
      fetchData();
    } catch (error) {
      toast.error('Failed to reject withdrawal');
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
            <nav className="flex space-x-8 px-6">
              {['overview', 'withdrawals', 'users', 'transactions'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
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

// Withdrawals Tab Component
const WithdrawalsTab = ({ withdrawals, onApprove, onComplete, onReject }) => {
  const [processingId, setProcessingId] = useState(null);

  if (withdrawals.length === 0) {
    return (
      <div className="text-center py-12">
        <FiCheckCircle className="w-16 h-16 mx-auto text-green-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Withdrawals</h3>
        <p className="text-gray-500">All withdrawal requests have been processed</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {withdrawals.map((withdrawal) => (
        <div key={withdrawal._id} className="border rounded-lg p-5 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <img 
                  src={withdrawal.userId?.profileImage || 'https://via.placeholder.com/40'} 
                  alt={withdrawal.userId?.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-semibold text-gray-900">{withdrawal.userId?.name}</p>
                  <p className="text-sm text-gray-500">{withdrawal.userId?.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-lg font-bold text-green-600">₹{withdrawal.amount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Payment Method</p>
                  <p className="text-sm font-medium text-gray-700">
                    {withdrawal.paymentMethod === 'upi' ? 'UPI' : 'Bank Transfer'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Requested</p>
                  <p className="text-sm text-gray-700">
                    {new Date(withdrawal.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Details</p>
                  {withdrawal.paymentMethod === 'upi' ? (
                    <p className="text-sm font-mono text-gray-700">{withdrawal.upiId}</p>
                  ) : (
                    <p className="text-sm text-gray-700">
                      {withdrawal.bankInfo?.bankName} - ****{withdrawal.bankInfo?.accountNumber?.slice(-4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => onApprove(withdrawal._id)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(withdrawal._id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Users Tab Component
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUsers({ search, role: roleFilter });
      setUsers(response.data.users);
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
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name or email..."
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
          <option value="all">All Users</option>
          <option value="teacher">Teachers</option>
          <option value="student">Students</option>
        </select>
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
                  <div className="flex items-center gap-3">
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