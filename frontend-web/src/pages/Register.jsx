// frontend-web/src/pages/Register.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { 
  FiMail, FiLock, FiUser, FiArrowRight, FiCheckCircle, 
  FiArrowLeft, FiBook, FiBriefcase, FiMapPin, FiCreditCard,
  FiSmartphone, FiCalendar, FiUsers, FiUserCheck, FiAward,
  FiGlobe, FiFileText, FiShield
} from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const { register, googleLogin, login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [tempUser, setTempUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [errors, setErrors] = useState({});

  // Step 1: Personal Details & Education
  const [step1Data, setStep1Data] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    bio: '',
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

  // Step 2: Bank Details & Account Type (NO SKILLS)
  const [step2Data, setStep2Data] = useState({
    bankAccount: {
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: ''
    },
    userType: 'learner',
    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToMarketing: false
  });

  const startTimer = () => {
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors = {};
    
    if (!step1Data.name.trim()) newErrors.name = 'Full name is required';
    if (!step1Data.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(step1Data.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!step1Data.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[0-9]{10}$/.test(step1Data.phone)) {
      newErrors.phone = 'Enter valid 10-digit phone number';
    }
    if (!step1Data.password) {
      newErrors.password = 'Password is required';
    } else if (step1Data.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (step1Data.password !== step1Data.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!step1Data.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!step1Data.gender) newErrors.gender = 'Gender is required';
    if (!step1Data.education.level) newErrors.educationLevel = 'Education level is required';
    if (!step1Data.education.institution) newErrors.institution = 'Institution name is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const newErrors = {};
    
    // Bank details validation (optional but validate format if provided)
    if (step2Data.bankAccount.accountNumber && !/^[0-9]{9,18}$/.test(step2Data.bankAccount.accountNumber)) {
      newErrors.accountNumber = 'Invalid account number';
    }
    if (step2Data.bankAccount.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(step2Data.bankAccount.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC code';
    }
    if (step2Data.bankAccount.upiId && !/^[\w.-]+@[\w.-]+$/.test(step2Data.bankAccount.upiId)) {
      newErrors.upiId = 'Invalid UPI ID';
    }
    if (!step2Data.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the Terms & Conditions';
    if (!step2Data.agreeToPrivacy) newErrors.agreeToPrivacy = 'You must agree to the Privacy Policy';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // ✅ SINGLE handleSubmit function (removed duplicate)
  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    
    try {
      // Prepare user data matching User model (NO SKILLS)
      const userData = {
        name: step1Data.name,
        email: step1Data.email,
        password: step1Data.password,
        bio: step1Data.bio || '',
        phone: step1Data.phone,
        location: step1Data.location,
        dateOfBirth: step1Data.dateOfBirth,
        gender: step1Data.gender,
        education: {
          level: step1Data.education.level || 'Other',
          institution: step1Data.education.institution || '',
          degree: step1Data.education.degree || '',
          fieldOfStudy: step1Data.education.fieldOfStudy || '',
          graduationYear: step1Data.education.graduationYear || null
        },
        bankAccount: step2Data.bankAccount,
        upiId: step2Data.bankAccount.upiId,
        userType: step2Data.userType,
        // ✅ Skills will be added in dashboard, not during registration
        skillsTeach: [],
        skillsLearn: []
      };
      
      console.log('📝 Registering user:', { email: userData.email, userType: userData.userType });
      
      const result = await register(userData);
      
      if (result && result.success) {
        setTempUser({ email: step1Data.email, name: step1Data.name });
        setTempPassword(step1Data.password);
        setShowOTPModal(true);
        toast.success('Registration successful! Please verify your email.');
        
        await authAPI.sendOTP({ email: step1Data.email, type: 'verification' });
        setResendTimer(60);
        startTimer();
      } else {
        toast.error(result?.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }

    setOtpLoading(true);
    try {
      const verifyResult = await authAPI.verifyOTP({ 
        email: tempUser.email, 
        otp, 
        type: 'verification' 
      });
      
      if (verifyResult.data?.success) {
        toast.success('Email verified successfully!');
        setShowOTPModal(false);
        setOtp('');
        
        const loginResult = await login(tempUser.email, tempPassword);
        if (loginResult && loginResult.success) {
          navigate('/dashboard');
        } else {
          toast.error('Auto-login failed. Please login manually.');
          navigate('/login');
        }
      } else {
        toast.error(verifyResult.data?.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) {
      toast.error(`Please wait ${resendTimer} seconds`);
      return;
    }
    try {
      await authAPI.sendOTP({ email: tempUser.email, type: 'verification' });
      toast.success('OTP resent successfully');
      setResendTimer(60);
      startTimer();
    } catch (error) {
      toast.error('Failed to resend OTP');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const result = await googleLogin(credentialResponse.credential);
      if (result && result.success) {
        toast.success('Google signup successful!');
        navigate('/dashboard');
      } else {
        toast.error('Google signup failed');
      }
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error('Google signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google signup failed');
  };

  const StepIndicator = () => (
    <div className="flex justify-between mb-8">
      {[1, 2].map((step) => (
        <div key={step} className="flex-1 text-center">
          <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center font-bold ${
            currentStep >= step 
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}>
            {currentStep > step ? <FiCheckCircle className="w-5 h-5" /> : step}
          </div>
          <p className={`text-sm mt-2 ${
            currentStep >= step ? 'text-blue-600' : 'text-gray-400'
          }`}>
            {step === 1 && 'Personal & Education'}
            {step === 2 && 'Banking & Preferences'}
          </p>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float animation-delay-4000"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold gradient-text mb-2">Join SkillSwap</h1>
              <p className="text-gray-600">Start your skill exchange journey today</p>
            </div>

            <StepIndicator />

            {currentStep === 1 && (
              <div className="mb-6">
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                    theme="outline"
                    size="large"
                    shape="rectangular"
                    text="signup_with"
                    width="100%"
                  />
                </div>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-4 bg-white/80 text-gray-500">Or sign up with email</span></div>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"
                >
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiUser className="text-blue-500" /> Personal Information
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Full Name *</label>
                      <div className="relative">
                        <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={step1Data.name}
                          onChange={(e) => setStep1Data({...step1Data, name: e.target.value})}
                          className={`input-field pl-10 ${errors.name ? 'border-red-500' : ''}`}
                          placeholder="Enter your full name"
                        />
                      </div>
                      {errors.name && <p className="error-text">{errors.name}</p>}
                    </div>
                    <div>
                      <label className="input-label">Email *</label>
                      <div className="relative">
                        <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          value={step1Data.email}
                          onChange={(e) => setStep1Data({...step1Data, email: e.target.value})}
                          className={`input-field pl-10 ${errors.email ? 'border-red-500' : ''}`}
                          placeholder="your@email.com"
                        />
                      </div>
                      {errors.email && <p className="error-text">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Phone *</label>
                      <div className="relative">
                        <FiSmartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={step1Data.phone}
                          onChange={(e) => setStep1Data({...step1Data, phone: e.target.value})}
                          className={`input-field pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                          placeholder="10-digit mobile number"
                        />
                      </div>
                      {errors.phone && <p className="error-text">{errors.phone}</p>}
                    </div>
                    <div>
                      <label className="input-label">Date of Birth *</label>
                      <div className="relative">
                        <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="date"
                          value={step1Data.dateOfBirth}
                          onChange={(e) => setStep1Data({...step1Data, dateOfBirth: e.target.value})}
                          className={`input-field pl-10 ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {errors.dateOfBirth && <p className="error-text">{errors.dateOfBirth}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Password *</label>
                      <div className="relative">
                        <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="password"
                          value={step1Data.password}
                          onChange={(e) => setStep1Data({...step1Data, password: e.target.value})}
                          className={`input-field pl-10 ${errors.password ? 'border-red-500' : ''}`}
                          placeholder="Min 6 characters"
                        />
                      </div>
                      {errors.password && <p className="error-text">{errors.password}</p>}
                    </div>
                    <div>
                      <label className="input-label">Confirm Password *</label>
                      <div className="relative">
                        <FiCheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="password"
                          value={step1Data.confirmPassword}
                          onChange={(e) => setStep1Data({...step1Data, confirmPassword: e.target.value})}
                          className={`input-field pl-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                          placeholder="Confirm password"
                        />
                      </div>
                      {errors.confirmPassword && <p className="error-text">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Gender *</label>
                    <select
                      value={step1Data.gender}
                      onChange={(e) => setStep1Data({...step1Data, gender: e.target.value})}
                      className={`input-field ${errors.gender ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    {errors.gender && <p className="error-text">{errors.gender}</p>}
                  </div>

                  <div>
                    <label className="input-label">Bio (Optional)</label>
                    <textarea
                      value={step1Data.bio}
                      onChange={(e) => setStep1Data({...step1Data, bio: e.target.value})}
                      rows="2"
                      className="input-field"
                      placeholder="Tell others about yourself..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">City</label>
                      <input
                        type="text"
                        value={step1Data.location.city}
                        onChange={(e) => setStep1Data({...step1Data, location: {...step1Data.location, city: e.target.value}})}
                        className="input-field"
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <label className="input-label">State</label>
                      <input
                        type="text"
                        value={step1Data.location.state}
                        onChange={(e) => setStep1Data({...step1Data, location: {...step1Data.location, state: e.target.value}})}
                        className="input-field"
                        placeholder="State"
                      />
                    </div>
                  </div>

                  <h2 className="text-lg font-semibold text-gray-800 mt-4 mb-2 flex items-center gap-2">
                    <FiAward className="text-blue-500" /> Education Details
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Education Level *</label>
                      <select
                        value={step1Data.education.level}
                        onChange={(e) => setStep1Data({...step1Data, education: {...step1Data.education, level: e.target.value}})}
                        className={`input-field ${errors.educationLevel ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select Education</option>
                        <option value="High School">High School</option>
                        <option value="Bachelor's">Bachelor's Degree</option>
                        <option value="Master's">Master's Degree</option>
                        <option value="PhD">PhD</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.educationLevel && <p className="error-text">{errors.educationLevel}</p>}
                    </div>
                    <div>
                      <label className="input-label">Institution *</label>
                      <input
                        type="text"
                        value={step1Data.education.institution}
                        onChange={(e) => setStep1Data({...step1Data, education: {...step1Data.education, institution: e.target.value}})}
                        className={`input-field ${errors.institution ? 'border-red-500' : ''}`}
                        placeholder="College/University Name"
                      />
                      {errors.institution && <p className="error-text">{errors.institution}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Degree/Course</label>
                      <input
                        type="text"
                        value={step1Data.education.degree}
                        onChange={(e) => setStep1Data({...step1Data, education: {...step1Data.education, degree: e.target.value}})}
                        className="input-field"
                        placeholder="e.g., B.Tech, B.Sc, MBA"
                      />
                    </div>
                    <div>
                      <label className="input-label">Field of Study</label>
                      <input
                        type="text"
                        value={step1Data.education.fieldOfStudy}
                        onChange={(e) => setStep1Data({...step1Data, education: {...step1Data.education, fieldOfStudy: e.target.value}})}
                        className="input-field"
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="input-label">Graduation Year</label>
                    <input
                      type="number"
                      value={step1Data.education.graduationYear}
                      onChange={(e) => setStep1Data({...step1Data, education: {...step1Data.education, graduationYear: e.target.value}})}
                      className="input-field"
                      placeholder="YYYY"
                      min="1950"
                      max="2030"
                    />
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 max-h-[60vh] overflow-y-auto pr-2"
                >
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiCreditCard className="text-purple-500" /> Bank Details (Optional)
                  </h2>
                  <p className="text-sm text-gray-500 mb-2">Add bank details to receive payments for teaching</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Account Holder Name</label>
                      <input
                        type="text"
                        value={step2Data.bankAccount.accountHolderName}
                        onChange={(e) => setStep2Data({...step2Data, bankAccount: {...step2Data.bankAccount, accountHolderName: e.target.value}})}
                        className="input-field"
                        placeholder="As per bank records"
                      />
                    </div>
                    <div>
                      <label className="input-label">Bank Name</label>
                      <input
                        type="text"
                        value={step2Data.bankAccount.bankName}
                        onChange={(e) => setStep2Data({...step2Data, bankAccount: {...step2Data.bankAccount, bankName: e.target.value}})}
                        className="input-field"
                        placeholder="e.g., State Bank of India"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Account Number</label>
                      <input
                        type="text"
                        value={step2Data.bankAccount.accountNumber}
                        onChange={(e) => setStep2Data({...step2Data, bankAccount: {...step2Data.bankAccount, accountNumber: e.target.value}})}
                        className={`input-field ${errors.accountNumber ? 'border-red-500' : ''}`}
                        placeholder="9-18 digit account number"
                      />
                      {errors.accountNumber && <p className="error-text">{errors.accountNumber}</p>}
                    </div>
                    <div>
                      <label className="input-label">IFSC Code</label>
                      <input
                        type="text"
                        value={step2Data.bankAccount.ifscCode}
                        onChange={(e) => setStep2Data({...step2Data, bankAccount: {...step2Data.bankAccount, ifscCode: e.target.value.toUpperCase()}})}
                        className={`input-field ${errors.ifscCode ? 'border-red-500' : ''}`}
                        placeholder="e.g., SBIN0123456"
                      />
                      {errors.ifscCode && <p className="error-text">{errors.ifscCode}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="input-label">UPI ID</label>
                    <div className="relative">
                      <FiCreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={step2Data.bankAccount.upiId}
                        onChange={(e) => setStep2Data({...step2Data, bankAccount: {...step2Data.bankAccount, upiId: e.target.value}})}
                        className={`input-field pl-10 ${errors.upiId ? 'border-red-500' : ''}`}
                        placeholder="name@okhdfcbank"
                      />
                    </div>
                    {errors.upiId && <p className="error-text">{errors.upiId}</p>}
                  </div>

                  <h2 className="text-lg font-semibold text-gray-800 mt-4 mb-2 flex items-center gap-2">
                    <FiUserCheck className="text-green-500" /> Account Type
                  </h2>

                  <div>
                    <label className="input-label">I want to...</label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => setStep2Data({...step2Data, userType: 'learner'})}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          step2Data.userType === 'learner'
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FiBook className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-sm font-medium">Learn Only</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep2Data({...step2Data, userType: 'teacher'})}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          step2Data.userType === 'teacher'
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FiBriefcase className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-sm font-medium">Teach Only</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep2Data({...step2Data, userType: 'both'})}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          step2Data.userType === 'both'
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FiUsers className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-sm font-medium">Both</span>
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FiShield className="text-orange-500" /> Terms & Conditions
                    </h2>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={step2Data.agreeToTerms}
                          onChange={(e) => setStep2Data({...step2Data, agreeToTerms: e.target.checked})}
                          className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          I agree to the <Link to="/terms" className="text-blue-500 hover:text-blue-600">Terms of Service</Link>
                        </span>
                      </label>
                      {errors.agreeToTerms && <p className="error-text text-sm">{errors.agreeToTerms}</p>}

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={step2Data.agreeToPrivacy}
                          onChange={(e) => setStep2Data({...step2Data, agreeToPrivacy: e.target.checked})}
                          className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          I agree to the <Link to="/privacy" className="text-blue-500 hover:text-blue-600">Privacy Policy</Link>
                        </span>
                      </label>
                      {errors.agreeToPrivacy && <p className="error-text text-sm">{errors.agreeToPrivacy}</p>}

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={step2Data.agreeToMarketing}
                          onChange={(e) => setStep2Data({...step2Data, agreeToMarketing: e.target.checked})}
                          className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          I want to receive updates about new features and skill opportunities
                        </span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-4 mt-8">
              {currentStep > 1 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBack}
                  className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <FiArrowLeft /> Back
                </motion.button>
              )}
              
              {currentStep < 2 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-colors flex items-center justify-center gap-2"
                >
                  Next <FiArrowRight />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Create Account <FiCheckCircle />
                    </>
                  )}
                </motion.button>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="text-blue-500 hover:text-blue-600 font-semibold">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* OTP Verification Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl max-w-md w-full p-6"
          >
            <h2 className="text-2xl font-bold text-center mb-2">Verify Your Email</h2>
            <p className="text-gray-600 text-center mb-6">
              We've sent a 6-digit verification code to<br />
              <span className="font-semibold">{tempUser?.email}</span>
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={otpLoading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
            >
              {otpLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                'Verify Email'
              )}
            </button>

            <div className="mt-4 text-center">
              <button
                onClick={handleResendOTP}
                disabled={resendTimer > 0}
                className="text-sm text-blue-500 hover:text-blue-600 disabled:text-gray-400"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>

            <button
              onClick={() => {
                setShowOTPModal(false);
                setOtp('');
              }}
              className="w-full mt-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default Register;