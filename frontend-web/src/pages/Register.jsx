// frontend-web/src/pages/Register.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { 
  FiMail, FiLock, FiUser, FiArrowRight, FiCheckCircle, 
  FiArrowLeft, FiBook, FiBriefcase, FiCreditCard,
  FiSmartphone, FiCalendar, FiUsers, FiUserCheck, FiAward,
  FiShield, FiVideo, FiRefreshCw, FiStar
} from 'react-icons/fi';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import skillswapLogo from '../assets/skillswaplogo.jpg';
import SkillSwapVideoScene from '../components/common/SkillSwapVideoScene';

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
    toast.error(`Google signup failed. Add ${window.location.origin} to Authorized JavaScript origins in Google Cloud Console.`);
  };

  const StepIndicator = () => (
    <div className="relative mb-8 px-4">
      <div className="absolute left-[20%] right-[20%] top-5 h-0.5 bg-gray-200 rounded-full" />
      <motion.div
        className="absolute left-[20%] top-5 h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
        initial={false}
        animate={{ width: currentStep === 1 ? '0%' : '60%' }}
        transition={{ duration: 0.4 }}
      />
      <div className="relative flex justify-between">
        {[
          { step: 1, label: 'Personal & Education', icon: FiUser },
          { step: 2, label: 'Banking & Preferences', icon: FiCreditCard },
        ].map(({ step, label, icon: Icon }) => (
          <div key={step} className="flex flex-col items-center">
            <div
              className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full font-bold transition-all duration-300 ${
                currentStep >= step
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-gray-100 text-gray-400 ring-2 ring-gray-200'
              }`}
            >
              {currentStep > step ? <FiCheckCircle className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
            </div>
            <p className={`mt-2 max-w-[7rem] text-center text-xs font-medium ${currentStep >= step ? 'text-emerald-700' : 'text-gray-400'}`}>
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const highlights = [
    { icon: FiVideo, text: 'Live 1-on-1 video sessions with expert peers' },
    { icon: FiRefreshCw, text: 'Swap skills — teach what you know, learn what you need' },
    { icon: FiStar, text: 'Build your profile and grow your learning network' },
  ];

  return (
    <>
      <div className="min-h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50/40">
        {/* Left — Brand & animation */}
        <motion.div
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="relative hidden overflow-hidden lg:flex lg:w-[42%] xl:w-[40%] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700"
        >
          <div className="absolute inset-0 opacity-25">
            <div className="absolute top-8 left-8 h-64 w-64 rounded-full bg-white mix-blend-overlay blur-3xl animate-pulse" />
            <div className="absolute bottom-12 right-8 h-72 w-72 rounded-full bg-yellow-300 mix-blend-overlay blur-3xl animate-pulse animation-delay-2000" />
            <div className="absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 mix-blend-overlay blur-3xl animate-pulse animation-delay-4000" />
          </div>
          <div className="absolute inset-0 bg-grid-white/[0.06] bg-[size:48px_48px]" />

          <div className="relative z-10 flex w-full flex-col items-center justify-center p-10 xl:p-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, delay: 0.1 }}
              className="mb-6"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-yellow-400/40 blur-2xl" />
                <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white/35 bg-white/10 shadow-2xl backdrop-blur-sm xl:h-32 xl:w-32">
                  <img src={skillswapLogo} alt="SkillSwap" className="h-full w-full object-cover" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mb-6 w-full"
            >
              <SkillSwapVideoScene />
            </motion.div>

            <motion.h1
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-3 text-4xl font-bold tracking-tight text-white xl:text-5xl"
            >
              Join <span className="text-yellow-300">SkillSwap</span>
            </motion.h1>
            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mb-8 max-w-sm text-center text-base text-white/85"
            >
              Connect with teachers worldwide and exchange skills through live video sessions
            </motion.p>

            <motion.ul
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="w-full max-w-sm space-y-3"
            >
              {highlights.map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20">
                    <Icon className="h-4 w-4 text-yellow-200" />
                  </div>
                  <span className="text-sm leading-relaxed text-white/90">{text}</span>
                </li>
              ))}
            </motion.ul>
          </div>
        </motion.div>

        {/* Right — Registration form */}
        <motion.div
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex w-full flex-1 items-start justify-center overflow-y-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="w-full max-w-2xl py-4 lg:py-6">
            {/* Mobile header */}
            <div className="mb-6 text-center lg:hidden">
              <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full ring-4 ring-emerald-100">
                <img src={skillswapLogo} alt="SkillSwap" className="h-full w-full object-cover" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Create Your Account
              </h1>
              <div className="mt-4 flex justify-center">
                <SkillSwapVideoScene />
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-xl shadow-emerald-900/5 backdrop-blur-sm sm:p-8">
              <div className="mb-2 hidden text-center lg:block">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Create Your Account
                </h1>
                <p className="mt-1 text-gray-500">Start swapping skills in just two quick steps</p>
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
                  className="space-y-4 max-h-[58vh] overflow-y-auto pr-1 scrollbar-thin"
                >
                  <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiUser className="text-emerald-600" /> Personal Information
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
                  </div>

                  <div className="rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 p-4 ring-1 ring-cyan-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiAward className="text-teal-600" /> Education Details
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
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4 max-h-[58vh] overflow-y-auto pr-1"
                >
                  <div className="rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 p-4 ring-1 ring-violet-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                    <FiCreditCard className="text-violet-600" /> Bank Details (Optional)
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
                  </div>

                  <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 p-4 ring-1 ring-emerald-100">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FiUserCheck className="text-emerald-600" /> Account Type
                  </h2>

                  <div>
                    <label className="input-label">I want to...</label>
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => setStep2Data({...step2Data, userType: 'learner'})}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          step2Data.userType === 'learner'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                            : 'border-gray-200 hover:border-emerald-200 hover:bg-gray-50'
                        }`}
                      >
                        <FiBook className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-sm font-medium">Learn Only</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep2Data({...step2Data, userType: 'teacher'})}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          step2Data.userType === 'teacher'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                            : 'border-gray-200 hover:border-emerald-200 hover:bg-gray-50'
                        }`}
                      >
                        <FiBriefcase className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-sm font-medium">Teach Only</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep2Data({...step2Data, userType: 'both'})}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          step2Data.userType === 'both'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                            : 'border-gray-200 hover:border-emerald-200 hover:bg-gray-50'
                        }`}
                      >
                        <FiUsers className="w-6 h-6 mx-auto mb-1" />
                        <span className="text-sm font-medium">Both</span>
                      </button>
                    </div>
                  </div>
                  </div>

                  <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-4">
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
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <FiArrowLeft /> Back
                </motion.button>
              )}
              
              {currentStep < 2 ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                >
                  Next <FiArrowRight />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-600 text-white rounded-xl hover:from-emerald-600 hover:to-cyan-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
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
                <Link to="/login" className="font-semibold text-emerald-600 hover:text-teal-600">
                  Sign In
                </Link>
              </p>
            </div>
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
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50"
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
