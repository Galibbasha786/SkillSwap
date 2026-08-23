// frontend-web/src/pages/Profile.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiAward, 
  FiBook, FiBriefcase, FiStar, FiClock, FiArrowLeft, FiEdit2,
  FiSave, FiX, FiCreditCard, FiAlertCircle, FiLink
} from 'react-icons/fi';
import { FaGithub, FaLinkedin } from 'react-icons/fa';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';
import ImageUpload from '../components/profile/ImageUpload';
import BackButton from '../components/common/BackButton';

const Profile = () => {
  const { user, getUserId } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
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
    },
    githubProfile: '',
    linkedinProfile: '',
  });

  // Bank Form State
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: ''
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
        setProfileImage(response.data.profileImage);
        setFormData({
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
          },
          githubProfile: response.data.githubProfile || '',
          linkedinProfile: response.data.linkedinProfile || '',
        });
        
        // Set bank form data
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
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const updateData = {
        name: formData.name,
        bio: formData.bio,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        location: formData.location,
        education: formData.education,
        githubProfile: formData.githubProfile.trim(),
        linkedinProfile: formData.linkedinProfile.trim(),
      };
      
      const response = await userAPI.updateProfile(updateData);
      
      if (response.data.success) {
        const updatedUser = response.data.user;
        
        setUserData(updatedUser);
        setProfileImage(updatedUser.profileImage);
        
        setFormData({
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
          },
          githubProfile: updatedUser.githubProfile || '',
          linkedinProfile: updatedUser.linkedinProfile || '',
        });
        
        toast.success('Profile updated successfully!');
        setEditing(false);
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleBankUpdate = async () => {
    try {
      const updateData = {
        bankAccount: {
          accountHolderName: bankForm.accountHolderName,
          bankName: bankForm.bankName,
          accountNumber: bankForm.accountNumber,
          ifscCode: bankForm.ifscCode,
        },
        upiId: bankForm.upiId
      };
      
      const response = await userAPI.updateProfile(updateData);
      
      if (response.data.success) {
        const updatedUser = response.data.user;
        
        setUserData(updatedUser);
        
        setBankForm({
          accountHolderName: updatedUser.bankAccount?.accountHolderName || '',
          bankName: updatedUser.bankAccount?.bankName || '',
          accountNumber: updatedUser.bankAccount?.accountNumber || '',
          ifscCode: updatedUser.bankAccount?.ifscCode || '',
          upiId: updatedUser.upiId || ''
        });
        
        toast.success('Bank details updated successfully!');
        setEditing(false);
      } else {
        toast.error('Failed to update bank details');
      }
    } catch (error) {
      console.error('Error updating bank details:', error);
      toast.error(error.response?.data?.message || 'Failed to update bank details');
    }
  };

  const handleImageUpdate = (newImage) => {
    setProfileImage(newImage);
    setUserData(prev => ({ ...prev, profileImage: newImage }));
    toast.success('Profile picture updated!');
  };

  const handleImageRemove = () => {
    const defaultImage = 'https://via.placeholder.com/150';
    setProfileImage(defaultImage);
    setUserData(prev => ({ ...prev, profileImage: defaultImage }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <BackButton />
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="ml-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <FiEdit2 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
          {editing && (
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => {
                  setEditing(false);
                  fetchUserData();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <FiX className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                <FiSave className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'personal'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FiUser className="inline mr-2 w-4 h-4" />
            Personal Info
          </button>
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-5 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'bank'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FiCreditCard className="inline mr-2 w-4 h-4" />
            Bank Details
          </button>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md overflow-visible"
        >
          {/* Cover Photo */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-xl overflow-hidden"></div>
          
          <div className="px-6 pb-6 relative z-10">
            {/* Profile Image */}
            <div className="flex items-end -mt-12 mb-4 overflow-visible">
              <ImageUpload
                currentImage={profileImage}
                onImageUpdate={handleImageUpdate}
                onImageRemove={handleImageRemove}
                size="large"
              />
              <div className="ml-4 flex-1">
                {editing && activeTab === 'personal' ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="text-2xl font-bold text-gray-900 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1 mb-1"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-gray-900">{userData?.name}</h2>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <FiStar className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-gray-600">{userData?.rating?.toFixed(1) || '0.0'}</span>
                  <span className="text-gray-400">•</span>
                  <FiClock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{userData?.totalSessions || 0} sessions</span>
                </div>
              </div>
            </div>

            {/* Personal Info Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                {/* Bio */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">About</h3>
                  {editing ? (
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      rows="3"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Tell others about yourself..."
                    />
                  ) : (
                    <p className="text-gray-700">{userData?.bio || 'No bio added yet'}</p>
                  )}
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FiMail className="w-4 h-4" /> Email
                    </h3>
                    <p className="text-gray-900">{userData?.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FiPhone className="w-4 h-4" /> Phone
                    </h3>
                    {editing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="10-digit mobile number"
                      />
                    ) : (
                      <p className="text-gray-900">{userData?.phone || 'Not added'}</p>
                    )}
                  </div>
                </div>

                {/* Social Profiles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FaGithub className="w-4 h-4" /> GitHub Profile
                    </h3>
                    {editing ? (
                      <input
                        type="url"
                        value={formData.githubProfile}
                        onChange={(e) => setFormData({ ...formData, githubProfile: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="https://github.com/username"
                      />
                    ) : userData?.githubProfile ? (
                      <a
                        href={userData.githubProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FiLink className="w-4 h-4" />
                        {userData.githubProfile}
                      </a>
                    ) : (
                      <p className="text-gray-500">Not added</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FaLinkedin className="w-4 h-4 text-[#0A66C2]" /> LinkedIn Profile
                    </h3>
                    {editing ? (
                      <input
                        type="url"
                        value={formData.linkedinProfile}
                        onChange={(e) => setFormData({ ...formData, linkedinProfile: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="https://linkedin.com/in/username"
                      />
                    ) : userData?.linkedinProfile ? (
                      <a
                        href={userData.linkedinProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <FiLink className="w-4 h-4" />
                        {userData.linkedinProfile}
                      </a>
                    ) : (
                      <p className="text-gray-500">Not added</p>
                    )}
                  </div>
                </div>

                {/* Personal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FiCalendar className="w-4 h-4" /> Date of Birth
                    </h3>
                    {editing ? (
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{userData?.dateOfBirth ? new Date(userData.dateOfBirth).toLocaleDateString() : 'Not added'}</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Gender</h3>
                    {editing ? (
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    ) : (
                      <p className="text-gray-900">{userData?.gender || 'Not specified'}</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiMapPin className="w-4 h-4" /> Location
                  </h3>
                  {editing ? (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.location.city}
                        onChange={(e) => setFormData({
                          ...formData,
                          location: {...formData.location, city: e.target.value}
                        })}
                        className="p-2 border border-gray-300 rounded-lg"
                        placeholder="City"
                      />
                      <input
                        type="text"
                        value={formData.location.state}
                        onChange={(e) => setFormData({
                          ...formData,
                          location: {...formData.location, state: e.target.value}
                        })}
                        className="p-2 border border-gray-300 rounded-lg"
                        placeholder="State"
                      />
                    </div>
                  ) : (
                    <p className="text-gray-900">
                      {userData?.location?.city || userData?.location?.state 
                        ? `${userData?.location?.city || ''} ${userData?.location?.state || ''}`.trim()
                        : 'Not added'}
                    </p>
                  )}
                </div>

                {/* Education */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiAward className="w-4 h-4" /> Education
                  </h3>
                  {editing ? (
                    <div className="space-y-2">
                      <select
                        value={formData.education.level}
                        onChange={(e) => setFormData({
                          ...formData,
                          education: {...formData.education, level: e.target.value}
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Education Level</option>
                        <option value="High School">High School</option>
                        <option value="Bachelor's">Bachelor's Degree</option>
                        <option value="Master's">Master's Degree</option>
                        <option value="PhD">PhD</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Other">Other</option>
                      </select>
                      <input
                        type="text"
                        value={formData.education.institution}
                        onChange={(e) => setFormData({
                          ...formData,
                          education: {...formData.education, institution: e.target.value}
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="Institution"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={formData.education.degree}
                          onChange={(e) => setFormData({
                            ...formData,
                            education: {...formData.education, degree: e.target.value}
                          })}
                          className="p-2 border border-gray-300 rounded-lg"
                          placeholder="Degree"
                        />
                        <input
                          type="text"
                          value={formData.education.fieldOfStudy}
                          onChange={(e) => setFormData({
                            ...formData,
                            education: {...formData.education, fieldOfStudy: e.target.value}
                          })}
                          className="p-2 border border-gray-300 rounded-lg"
                          placeholder="Field of Study"
                        />
                      </div>
                      <input
                        type="number"
                        value={formData.education.graduationYear}
                        onChange={(e) => setFormData({
                          ...formData,
                          education: {...formData.education, graduationYear: e.target.value}
                        })}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="Graduation Year"
                        min="1950"
                        max="2030"
                      />
                    </div>
                  ) : (
                    <div>
                      {userData?.education?.level && (
                        <p className="text-gray-900"><span className="font-medium">Level:</span> {userData.education.level}</p>
                      )}
                      {userData?.education?.institution && (
                        <p className="text-gray-900"><span className="font-medium">Institution:</span> {userData.education.institution}</p>
                      )}
                      {(userData?.education?.degree || userData?.education?.fieldOfStudy) && (
                        <p className="text-gray-900">
                          <span className="font-medium">Degree:</span> {userData.education.degree} {userData.education.fieldOfStudy && `in ${userData.education.fieldOfStudy}`}
                        </p>
                      )}
                      {userData?.education?.graduationYear && (
                        <p className="text-gray-900"><span className="font-medium">Graduation Year:</span> {userData.education.graduationYear}</p>
                      )}
                      {!userData?.education?.level && <p className="text-gray-500">No education details added</p>}
                    </div>
                  )}
                </div>

                {/* Skills Section */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiBook className="w-4 h-4" /> Skills I Teach
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {userData?.skillsTeach?.length > 0 ? (
                      userData.skillsTeach.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                          {skill.name} {skill.hourlyRate && `(₹${skill.hourlyRate}/hr)`}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">No teaching skills added</p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FiBriefcase className="w-4 h-4" /> Skills I Want to Learn
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {userData?.skillsLearn?.length > 0 ? (
                      userData.skillsLearn.map((skill, idx) => (
                        <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                          {skill.name} {skill.budget && `(₹${skill.budget}/hr budget)`}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">No learning goals added</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bank Details Tab */}
            {activeTab === 'bank' && (
              <div className="space-y-5">
                <p className="text-sm text-gray-500 mb-4">Add your bank details to receive payments for teaching sessions</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={bankForm.accountHolderName}
                      onChange={(e) => setBankForm({...bankForm, accountHolderName: e.target.value})}
                      disabled={!editing}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${!editing ? 'bg-gray-50' : ''}`}
                      placeholder="As per bank records"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({...bankForm, bankName: e.target.value})}
                      disabled={!editing}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${!editing ? 'bg-gray-50' : ''}`}
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
                      disabled={!editing}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${!editing ? 'bg-gray-50' : ''}`}
                      placeholder="9-18 digit account number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm({...bankForm, ifscCode: e.target.value.toUpperCase()})}
                      disabled={!editing}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg uppercase ${!editing ? 'bg-gray-50' : ''}`}
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
                      disabled={!editing}
                      className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${!editing ? 'bg-gray-50' : ''}`}
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

                {editing && (
                  <div className="pt-4">
                    <button
                      onClick={handleBankUpdate}
                      className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 flex items-center gap-2"
                    >
                      <FiSave className="w-4 h-4" />
                      Save Bank Details
                    </button>
                  </div>
                )}

                {!editing && bankForm.accountHolderName && (
                  <div className="pt-4 text-center">
                    <p className="text-sm text-green-600">✓ Bank details are configured</p>
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

export default Profile;