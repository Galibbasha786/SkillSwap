// frontend-web/src/pages/admin/AdminUserDetails.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiArrowLeft, FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, 
  FiAward, FiBook, FiBriefcase, FiStar, FiClock, FiDollarSign,
  FiCreditCard, FiSmartphone, FiGlobe, FiCheckCircle, FiXCircle,
  FiLoader, FiAlertCircle, FiEdit2, FiSave, FiX
} from 'react-icons/fi';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const AdminUserDetails = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getUserDetails(userId);
      setUser(response.data.user);
      setFormData(response.data.user);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user details');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    try {
      await adminAPI.updateUser(userId, formData);
      toast.success('User details updated successfully!');
      setUser(formData);
      setEditing(false);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleStatusToggle = async () => {
    try {
      await adminAPI.updateUserStatus(userId, { isActive: !user.isActive });
      setUser({ ...user, isActive: !user.isActive });
      toast.success(`User ${!user.isActive ? 'activated' : 'suspended'} successfully`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FiLoader className="w-12 h-12 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800">User not found</h2>
          <button
            onClick={() => navigate('/admin')}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleStatusToggle}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                user.isActive
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {user.isActive ? (
                <><FiXCircle className="w-4 h-4" /> Suspend User</>
              ) : (
                <><FiCheckCircle className="w-4 h-4" /> Activate User</>
              )}
            </button>
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <FiEdit2 className="w-4 h-4" /> Edit
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData(user);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <FiX className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleUpdateUser}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
                >
                  <FiSave className="w-4 h-4" /> Save
                </button>
              </>
            )}
          </div>
        </div>

        {/* User Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md overflow-hidden"
        >
          {/* Cover Photo */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500"></div>

          <div className="px-6 pb-6">
            {/* Profile Header */}
            <div className="flex items-end -mt-12 mb-6">
              <img
                src={user.profileImage || 'https://via.placeholder.com/120'}
                alt={user.name}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <div className="ml-4 flex-1">
                <div className="flex items-center gap-2">
                  {editing ? (
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="text-2xl font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1"
                    />
                  ) : (
                    <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    user.skillsTeach?.length > 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 
                     user.skillsTeach?.length > 0 ? 'Teacher' : 'Student'}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.isActive ? 'Active' : 'Suspended'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-gray-600">{user.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-gray-400">•</span>
                  <FiClock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{user.totalSessions || 0} sessions</span>
                  <span className="text-gray-400">•</span>
                  <FiDollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">₹{user.totalEarnings || 0} earned</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b">
              {['personal', 'education', 'bank', 'skills', 'wallet'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    {editing ? (
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900 flex items-center gap-2"><FiMail className="text-gray-400" /> {user.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                    {editing ? (
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="10-digit mobile number"
                      />
                    ) : (
                      <p className="text-gray-900 flex items-center gap-2"><FiSmartphone className="text-gray-400" /> {user.phone || 'Not added'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Date of Birth</label>
                    {editing ? (
                      <input
                        type="date"
                        value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ''}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900 flex items-center gap-2"><FiCalendar className="text-gray-400" /> {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not added'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Gender</label>
                    {editing ? (
                      <select
                        value={formData.gender || ''}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{user.gender || 'Not specified'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Bio</label>
                  {editing ? (
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows="3"
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="No bio added"
                    />
                  ) : (
                    <p className="text-gray-700">{user.bio || 'No bio added'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Location</label>
                  {editing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.location?.city || ''}
                        onChange={(e) => setFormData({ ...formData, location: { ...formData.location, city: e.target.value } })}
                        className="p-2 border border-gray-300 rounded-lg"
                        placeholder="City"
                      />
                      <input
                        type="text"
                        value={formData.location?.state || ''}
                        onChange={(e) => setFormData({ ...formData, location: { ...formData.location, state: e.target.value } })}
                        className="p-2 border border-gray-300 rounded-lg"
                        placeholder="State"
                      />
                      <input
                        type="text"
                        value={formData.location?.country || 'India'}
                        onChange={(e) => setFormData({ ...formData, location: { ...formData.location, country: e.target.value } })}
                        className="p-2 border border-gray-300 rounded-lg"
                        placeholder="Country"
                      />
                      <input
                        type="text"
                        value={formData.location?.pincode || ''}
                        onChange={(e) => setFormData({ ...formData, location: { ...formData.location, pincode: e.target.value } })}
                        className="p-2 border border-gray-300 rounded-lg"
                        placeholder="Pincode"
                      />
                    </div>
                  ) : (
                    <p className="text-gray-900 flex items-center gap-2">
                      <FiMapPin className="text-gray-400" />
                      {user.location?.city || user.location?.state 
                        ? `${user.location.city || ''} ${user.location.state || ''}, ${user.location.country || 'India'}`
                        : 'Not added'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Education Tab */}
            {activeTab === 'education' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Education Level</label>
                    {editing ? (
                      <select
                        value={formData.education?.level || ''}
                        onChange={(e) => setFormData({ ...formData, education: { ...formData.education, level: e.target.value } })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Education</option>
                        <option value="High School">High School</option>
                        <option value="Bachelor's">Bachelor's Degree</option>
                        <option value="Master's">Master's Degree</option>
                        <option value="PhD">PhD</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{user.education?.level || 'Not added'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Institution</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.education?.institution || ''}
                        onChange={(e) => setFormData({ ...formData, education: { ...formData.education, institution: e.target.value } })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{user.education?.institution || 'Not added'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Degree/Course</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.education?.degree || ''}
                        onChange={(e) => setFormData({ ...formData, education: { ...formData.education, degree: e.target.value } })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{user.education?.degree || 'Not added'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Field of Study</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.education?.fieldOfStudy || ''}
                        onChange={(e) => setFormData({ ...formData, education: { ...formData.education, fieldOfStudy: e.target.value } })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{user.education?.fieldOfStudy || 'Not added'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Graduation Year</label>
                  {editing ? (
                    <input
                      type="number"
                      value={formData.education?.graduationYear || ''}
                      onChange={(e) => setFormData({ ...formData, education: { ...formData.education, graduationYear: e.target.value } })}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="YYYY"
                      min="1950"
                      max="2030"
                    />
                  ) : (
                    <p className="text-gray-900">{user.education?.graduationYear || 'Not added'}</p>
                  )}
                </div>
              </div>
            )}

            {/* Bank Details Tab */}
            {activeTab === 'bank' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Account Holder Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.bankAccount?.accountHolderName || ''}
                        onChange={(e) => setFormData({ ...formData, bankAccount: { ...formData.bankAccount, accountHolderName: e.target.value } })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{user.bankAccount?.accountHolderName || 'Not added'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Bank Name</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.bankAccount?.bankName || ''}
                        onChange={(e) => setFormData({ ...formData, bankAccount: { ...formData.bankAccount, bankName: e.target.value } })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{user.bankAccount?.bankName || 'Not added'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Account Number</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.bankAccount?.accountNumber || ''}
                        onChange={(e) => setFormData({ ...formData, bankAccount: { ...formData.bankAccount, accountNumber: e.target.value } })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{user.bankAccount?.accountNumber ? `****${user.bankAccount.accountNumber.slice(-4)}` : 'Not added'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">IFSC Code</label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.bankAccount?.ifscCode || ''}
                        onChange={(e) => setFormData({ ...formData, bankAccount: { ...formData.bankAccount, ifscCode: e.target.value.toUpperCase() } })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{user.bankAccount?.ifscCode || 'Not added'}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">UPI ID</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.upiId || ''}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">{user.upiId || 'Not added'}</p>
                  )}
                </div>
              </div>
            )}

            {/* Skills Tab */}
            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FiBook className="text-blue-500" /> Skills They Teach
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.skillsTeach?.length > 0 ? (
                      user.skillsTeach.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {skill.name} {skill.hourlyRate && `(₹${skill.hourlyRate}/hr)`}
                          {skill.experience && ` • ${skill.experience}`}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">No teaching skills added</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FiBriefcase className="text-purple-500" /> Skills They Want to Learn
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {user.skillsLearn?.length > 0 ? (
                      user.skillsLearn.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          {skill.name} {skill.budget && `(₹${skill.budget}/hr budget)`}
                          {skill.priority && ` • ${skill.priority} priority`}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">No learning goals added</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Balance</p>
                    <p className="text-2xl font-bold text-green-600">₹{user.wallet?.balance?.toFixed(2) || 0}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Total Earnings</p>
                    <p className="text-2xl font-bold text-blue-600">₹{user.totalEarnings || 0}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="text-2xl font-bold text-purple-600">₹{user.totalSpent || 0}</p>
                  </div>
                </div>

                {user.wallet?.withdrawals?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Withdrawal History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm">Date</th>
                            <th className="px-4 py-2 text-left text-sm">Amount</th>
                            <th className="px-4 py-2 text-left text-sm">Status</th>
                            <th className="px-4 py-2 text-left text-sm">Transaction ID</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {user.wallet.withdrawals.map((withdrawal, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm">{new Date(withdrawal.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2 text-sm font-medium text-green-600">₹{withdrawal.amount}</td>
                              <td className="px-4 py-2 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  withdrawal.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  withdrawal.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {withdrawal.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm font-mono">{withdrawal.transactionId || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {user.wallet?.transactions?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Transaction History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm">Date</th>
                            <th className="px-4 py-2 text-left text-sm">Type</th>
                            <th className="px-4 py-2 text-left text-sm">Amount</th>
                            <th className="px-4 py-2 text-left text-sm">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {user.wallet.transactions.map((transaction, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm">{new Date(transaction.date).toLocaleDateString()}</td>
                              <td className="px-4 py-2 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  transaction.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {transaction.type === 'credit' ? 'Credit' : 'Debit'}
                                </span>
                              </td>
                              <td className={`px-4 py-2 text-sm font-medium ${
                                transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {transaction.type === 'credit' ? '+' : '-'} ₹{transaction.amount}
                              </td>
                              <td className="px-4 py-2 text-sm">{transaction.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminUserDetails;