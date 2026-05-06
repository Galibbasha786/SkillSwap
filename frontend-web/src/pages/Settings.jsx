import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { 
  FiUser, 
  FiLock, 
  FiSave, 
  FiSmartphone,
  FiCalendar,
  FiCreditCard,
  FiAlertCircle,
  FiClock,
  FiDroplet
} from 'react-icons/fi';
import { userAPI, authAPI } from '../services/api';
import TimeSlotManager from '../components/sessions/TimeSlotManager';
import toast from 'react-hot-toast';
import BackButton from '../components/common/BackButton';
import { useTheme } from '../contexts/ThemeContext';

const Settings = () => {
  const { user, getUserId } = useAuth();
  const { colorTheme, setColorTheme, colorThemes } = useTheme();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState(null);
  const [timeSlotManagerOpen, setTimeSlotManagerOpen] = useState(false);
  
  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    bio: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    location: {
      city: '',
      state: '',
      country: 'India',
      pincode: ''
    },
    education: {
      level: '',
      institution: '',
      degree: '',
      fieldOfStudy: '',
      graduationYear: ''
    }
  });

  // Bank Details Form State
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: ''
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userId = getUserId() || user?.id || user?._id;
      if (userId) {
        const response = await userAPI.getProfile(userId);
        setUserData(response.data);
        
        // Populate profile form
        setProfileForm({
          name: response.data.name || '',
          bio: response.data.bio || '',
          phone: response.data.phone || '',
          dateOfBirth: response.data.dateOfBirth ? new Date(response.data.dateOfBirth).toISOString().split('T')[0] : '',
          gender: response.data.gender || '',
          location: {
            city: response.data.location?.city || '',
            state: response.data.location?.state || '',
            country: response.data.location?.country || 'India',
            pincode: response.data.location?.pincode || ''
          },
          education: {
            level: response.data.education?.level || '',
            institution: response.data.education?.institution || '',
            degree: response.data.education?.degree || '',
            fieldOfStudy: response.data.education?.fieldOfStudy || '',
            graduationYear: response.data.education?.graduationYear || ''
          }
        });
        
        // Populate bank form
        setBankForm({
          accountHolderName: response.data.bankAccount?.accountHolderName || '',
          bankName: response.data.bankAccount?.bankName || '',
          accountNumber: response.data.bankAccount?.accountNumber || '',
          ifscCode: response.data.bankAccount?.ifscCode || '',
          upiId: response.data.upiId || ''
        });
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    }
  };

  // In Settings.jsx - handleProfileUpdate
// frontend-web/src/pages/Settings.jsx
// Replace the handleProfileUpdate function with this:

// frontend-web/src/pages/Settings.jsx
// Replace the handleProfileUpdate function with this:

const handleProfileUpdate = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const updateData = {
      name: profileForm.name,
      bio: profileForm.bio,
      phone: profileForm.phone,
      dateOfBirth: profileForm.dateOfBirth,
      gender: profileForm.gender,
      location: {
        city: profileForm.location.city || '',
        state: profileForm.location.state || '',
        country: profileForm.location.country || 'India',
        pincode: profileForm.location.pincode || ''
      },
      education: {
        level: profileForm.education.level || 'Other',
        institution: profileForm.education.institution || '',
        degree: profileForm.education.degree || '',
        fieldOfStudy: profileForm.education.fieldOfStudy || '',
        graduationYear: profileForm.education.graduationYear || null
      }
    };
    
    console.log('📤 Updating profile from settings:', updateData);
    
    const response = await userAPI.updateProfile(updateData);
    console.log('✅ Settings update response:', response.data);
    
    if (response.data.success) {
      const updatedUser = response.data.user;
      
      // Update local userData
      setUserData(updatedUser);
      
      // Update profile form with new data
      setProfileForm({
        name: updatedUser.name || '',
        bio: updatedUser.bio || '',
        phone: updatedUser.phone || '',
        dateOfBirth: updatedUser.dateOfBirth ? new Date(updatedUser.dateOfBirth).toISOString().split('T')[0] : '',
        gender: updatedUser.gender || '',
        location: {
          city: updatedUser.location?.city || '',
          state: updatedUser.location?.state || '',
          country: updatedUser.location?.country || 'India',
          pincode: updatedUser.location?.pincode || ''
        },
        education: {
          level: updatedUser.education?.level || '',
          institution: updatedUser.education?.institution || '',
          degree: updatedUser.education?.degree || '',
          fieldOfStudy: updatedUser.education?.fieldOfStudy || '',
          graduationYear: updatedUser.education?.graduationYear || ''
        }
      });
      
      toast.success('Profile updated successfully!');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    toast.error(error.response?.data?.message || 'Failed to update profile');
  } finally {
    setLoading(false);
  }
};

// In Settings.jsx - handleBankUpdate
// frontend-web/src/pages/Settings.jsx
// Replace the handleBankUpdate function with this:

const handleBankUpdate = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const updateData = {
      bankAccount: {
        accountHolderName: bankForm.accountHolderName || '',
        bankName: bankForm.bankName || '',
        accountNumber: bankForm.accountNumber || '',
        ifscCode: bankForm.ifscCode || '',
        isVerified: false
      },
      upiId: bankForm.upiId || ''
    };
    
    console.log('Updating bank details:', updateData);
    
    await userAPI.updateProfile(updateData);
    toast.success('Bank details updated successfully!');
    fetchUserData();
  } catch (error) {
    console.error('Error updating bank details:', error);
    toast.error(error.response?.data?.message || 'Failed to update bank details');
  } finally {
    setLoading(false);
  }
};

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    try {
      const passwordData = {
        newPassword: passwordForm.newPassword
      };
      
      if (!user?.isOAuth) {
        passwordData.currentPassword = passwordForm.currentPassword;
      }
      
      await authAPI.changePassword(passwordData);
      
      toast.success('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: FiUser },
    { id: 'bank', label: 'Bank Details', icon: FiCreditCard },
    { id: 'schedule', label: 'Teaching Schedule', icon: FiClock },
    { id: 'appearance', label: 'Appearance', icon: FiDroplet },
    { id: 'password', label: 'Password', icon: FiLock }
  ];

  const handleColorThemeChange = (themeId) => {
    setColorTheme(themeId);
    const selectedTheme = colorThemes.find((themeOption) => themeOption.id === themeId);
    toast.success(`${selectedTheme?.name || 'Theme'} theme applied`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <BackButton />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Settings */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Profile Information</h2>
            
            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <FiSmartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => setProfileForm({...profileForm, dateOfBirth: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({...profileForm, gender: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={profileForm.location.city}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      location: {...profileForm.location, city: e.target.value}
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={profileForm.location.state}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      location: {...profileForm.location, state: e.target.value}
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="State"
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 pt-4 mt-2 border-t">Education Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Education Level</label>
                  <select
                    value={profileForm.education.level}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      education: {...profileForm.education, level: e.target.value}
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Education</option>
                    <option value="High School">High School</option>
                    <option value="Bachelor's">Bachelor's Degree</option>
                    <option value="Master's">Master's Degree</option>
                    <option value="PhD">PhD</option>
                    <option value="Diploma">Diploma</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                  <input
                    type="text"
                    value={profileForm.education.institution}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      education: {...profileForm.education, institution: e.target.value}
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="College/University"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Degree/Course</label>
                  <input
                    type="text"
                    value={profileForm.education.degree}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      education: {...profileForm.education, degree: e.target.value}
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., B.Tech, MBA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
                  <input
                    type="text"
                    value={profileForm.education.fieldOfStudy}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      education: {...profileForm.education, fieldOfStudy: e.target.value}
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Computer Science"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                <input
                  type="number"
                  value={profileForm.education.graduationYear}
                  onChange={(e) => setProfileForm({
                    ...profileForm,
                    education: {...profileForm.education, graduationYear: e.target.value}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="YYYY"
                  min="1950"
                  max="2030"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Bank Details Settings */}
        {activeTab === 'bank' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Bank Account Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Add your bank details to receive payments for teaching sessions</p>
            
            <form onSubmit={handleBankUpdate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={bankForm.accountHolderName}
                    onChange={(e) => setBankForm({...bankForm, accountHolderName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="As per bank records"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({...bankForm, bankName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., State Bank of India"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({...bankForm, accountNumber: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="9-18 digit account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={bankForm.ifscCode}
                    onChange={(e) => setBankForm({...bankForm, ifscCode: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase"
                    placeholder="e.g., SBIN0123456"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                <div className="relative">
                  <FiCreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={bankForm.upiId}
                    onChange={(e) => setBankForm({...bankForm, upiId: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="name@okhdfcbank"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Your UPI ID for receiving payments</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <div className="flex items-start gap-2">
                  <FiAlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <p className="text-xs text-yellow-700">
                    Please ensure your bank details are correct. Incorrect details may delay payments.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                  Save Bank Details
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Appearance Settings */}
        {activeTab === 'appearance' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Color Theme
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose the accent colors used across SkillSwap.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {colorThemes.map((themeOption) => {
                const isSelected = colorTheme === themeOption.id;

                return (
                  <button
                    type="button"
                    key={themeOption.id}
                    onClick={() => handleColorThemeChange(themeOption.id)}
                    className={`text-left p-4 rounded-lg border-2 transition-all bg-white dark:bg-gray-700 ${
                      isSelected
                        ? 'border-blue-500 shadow-md'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-500'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{themeOption.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{themeOption.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-blue-500' : 'border-gray-300 dark:border-gray-500'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      {themeOption.colors.map((color) => (
                        <span
                          key={color}
                          className="h-8 flex-1 rounded-md border border-black/5 dark:border-white/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Teaching Schedule Settings */}
        {activeTab === 'schedule' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
          >
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Manage Your Teaching Schedule
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Set your available time slots for teaching. Students will only be able to book sessions during these times.
              </p>
            </div>
            <button
              onClick={() => setTimeSlotManagerOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors font-medium"
            >
              <FiClock className="w-5 h-5" />
              Manage Time Slots
            </button>
          </motion.div>
        )}

        {/* Password Settings */}
        {activeTab === 'password' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Change Password</h2>
            
            <form onSubmit={handlePasswordChange} className="space-y-5">
              {!user?.isOAuth && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required={!user?.isOAuth}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiSave className="w-4 h-4" />}
                  Change Password
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>

      {/* Time Slot Manager Modal */}
      <TimeSlotManager
        teacherId={userData?._id || user?.id}
        isOpen={timeSlotManagerOpen}
        onClose={() => setTimeSlotManagerOpen(false)}
      />
    </div>
  );
};

export default Settings;
