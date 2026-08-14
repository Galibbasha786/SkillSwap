// frontend-web/src/pages/Login.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { FiMail, FiLock, FiArrowRight, FiUser, FiAlertCircle, FiEye, FiEyeOff, FiStar, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { GoogleLogin } from '@react-oauth/google';
import ReCAPTCHA from 'react-google-recaptcha';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import skillswapLogo from '../assets/skillswaplogo.jpg';
import LearningScene from '../components/common/LearningScene';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [otp, setOtp] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = useRef();
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  // Quotes for rotation
  const quotes = [
    { text: "Learn. Share. Grow.", icon: FiStar, color: "from-yellow-400 to-orange-500" },
    { text: "Exchange Skills, Build Dreams", icon: FiTrendingUp, color: "from-green-400 to-emerald-500" },
    { text: "Connect with Experts", icon: FiUsers, color: "from-blue-400 to-indigo-500" },
    { text: "Teach What You Know", icon: FiStar, color: "from-purple-400 to-pink-500" },
    { text: "Learn What You Love", icon: FiTrendingUp, color: "from-rose-400 to-red-500" }
  ];

  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  // Rotate quotes every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Load saved email if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoginError('');
    
    if (!email.trim()) {
      setLoginError('Please enter your email address');
      toast.error('Please enter your email address');
      return;
    }
    
    if (!password) {
      setLoginError('Please enter your password');
      toast.error('Please enter your password');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }

    if (!captchaToken) {
      setLoginError('Please verify the CAPTCHA');
      toast.error('Please verify the CAPTCHA');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await login(email, password, captchaToken);
      
      if (result.success && result.user) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        if (result.user.role === 'admin') {
          toast.success('Welcome Admin! Redirecting to admin panel...');
          setTimeout(() => {
            navigate('/admin');
          }, 500);
        } else {
          toast.success('Login successful! Redirecting to dashboard...');
          setTimeout(() => {
            navigate('/dashboard');
          }, 500);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      
      if (errorMessage === 'Email not verified') {
        setUnverifiedEmail(email);
        setShowVerifyModal(true);
        toast.error('Please verify your email first. OTP sent to your email.');
      } else if (errorMessage === 'Invalid credentials') {
        setLoginError('Invalid email or password. Please try again.');
        toast.error('Invalid email or password. Please try again.');
      } else if (errorMessage === 'Account is suspended') {
        setLoginError('Your account has been suspended. Please contact support.');
        toast.error('Your account has been suspended. Please contact support.');
      } else if (errorMessage === 'Account not found') {
        setLoginError('No account found with this email. Please register first.');
        toast.error('No account found with this email. Please register first.');
      } else if (errorMessage.includes('CAPTCHA')) {
        setLoginError('CAPTCHA verification failed. Please try again.');
        toast.error('CAPTCHA verification failed. Please try again.');
        // Reset captcha
        if (captchaRef.current) {
          captchaRef.current.reset();
          setCaptchaToken(null);
        }
      } else {
        setLoginError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    if (!/^\d+$/.test(otp)) {
      toast.error('OTP should contain only numbers');
      return;
    }

    setResendLoading(true);
    try {
      const response = await authAPI.verifyOTP({ 
        email: unverifiedEmail, 
        otp, 
        type: 'verification' 
      });
      
      if (response.data.success) {
        toast.success('Email verified successfully!');
        setShowVerifyModal(false);
        setOtp('');
        
        const result = await login(unverifiedEmail, password);
        if (result.success && result.user) {
          if (result.user.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        }
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      const errorMessage = error.response?.data?.message || 'Invalid or expired OTP';
      toast.error(errorMessage);
      
      if (errorMessage.includes('expired')) {
        toast.error('OTP has expired. Please request a new one.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) {
      toast.error(`Please wait ${resendTimer} seconds before requesting another OTP`);
      return;
    }

    setResendLoading(true);
    try {
      const response = await authAPI.sendOTP({ 
        email: unverifiedEmail, 
        type: 'verification' 
      });
      
      if (response.data.success) {
        toast.success('Verification OTP resent to your email');
        setResendTimer(60);
        startTimer();
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      setLoginError('');
      
      const result = await googleLogin(credentialResponse.credential);
      
      if (result.success && result.user) {
        toast.success('Google login successful!');
        
        if (result.user.role === 'admin') {
          setTimeout(() => {
            navigate('/admin');
          }, 500);
        } else {
          setTimeout(() => {
            navigate('/dashboard');
          }, 500);
        }
      } else {
        toast.error(result.error || 'Google login failed');
        setLoginError(result.error || 'Google login failed');
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Google login failed. Please try again.');
      setLoginError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    console.error('Google login error');
    const origin = window.location.origin;
    const message = `Google login failed. In Google Cloud Console, add ${origin} to Authorized JavaScript origins for the OAuth client used by this app.`;
    toast.error('Google login failed. Check OAuth origin settings.');
    setLoginError(message);
  };

  const handleForgotPassword = () => {
    if (!email) {
      toast.error('Please enter your email address to reset password');
      return;
    }
    navigate('/forgot-password', { state: { email } });
  };

  const currentQuote = quotes[currentQuoteIndex];
  const QuoteIcon = currentQuote.icon;

  return (
    <>
      <div className="min-h-screen flex overflow-hidden bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
        {/* Left Side - Brand Section */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700"
        >
          {/* Animated Background Patterns */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full mix-blend-overlay filter blur-3xl animate-pulse"></div>
              <div className="absolute bottom-10 right-10 w-96 h-96 bg-yellow-400 rounded-full mix-blend-overlay filter blur-3xl animate-pulse animation-delay-2000"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-400 rounded-full mix-blend-overlay filter blur-3xl animate-pulse animation-delay-4000"></div>
            </div>
          </div>

          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:50px_50px]"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center items-center text-center p-12 w-full">
            {/* Logo Container with Animation - Circular with proper cropping */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
              className="mb-8 relative"
            >
              {/* Outer Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              
              {/* Main Circular Container */}
              <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm border-4 border-white/30 shadow-2xl flex items-center justify-center overflow-hidden">
                {/* Image Container with proper object-fit cover to make square image circular */}
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img 
                    src={skillswapLogo} 
                    alt="SkillSwap Logo" 
                    className="w-full h-full object-cover transform transition-transform duration-500 hover:scale-110"
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.7 }}
              className="relative mb-8 w-full"
            >
              <LearningScene variant="login" />
            </motion.div>

            {/* Brand Name with Animation */}
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-6xl font-bold text-white mb-4 tracking-tight"
            >
              Skill<span className="text-yellow-300">Swap</span>
            </motion.h1>

            {/* Rotating Quote Section */}
            <div className="relative h-32 mt-8">
              <motion.div
                key={currentQuoteIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="absolute w-full"
              >
                <div className={`bg-gradient-to-r ${currentQuote.color} bg-clip-text`}>
                  <QuoteIcon className="w-12 h-12 text-white/80 mx-auto mb-4" />
                  <p className="text-3xl font-semibold text-white">
                    {currentQuote.text}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Stats Section */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-white/20"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">10K+</div>
                <div className="text-sm text-white/80 mt-1">Active Learners</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">500+</div>
                <div className="text-sm text-white/80 mt-1">Expert Mentors</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-300">50+</div>
                <div className="text-sm text-white/80 mt-1">Skill Categories</div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full lg:w-1/2 flex items-center justify-center p-4 bg-white overflow-y-auto"
        >
          <div className="w-full max-w-md py-8">
            {/* Mobile Logo (visible only on mobile) - Circular */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-block">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 p-0.5">
                  <div className="w-full h-full rounded-full bg-white overflow-hidden">
                    <img 
                      src={skillswapLogo} 
                      alt="SkillSwap" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
              <h2 className="text-2xl font-bold mt-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome Back!
              </h2>
            </div>

            {/* Header */}
            <div className="hidden lg:block text-center mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Welcome Back
              </h1>
              <p className="text-gray-600 mt-2">Sign in to continue your learning journey</p>
            </div>

            {/* Error Alert */}
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
              >
                <FiAlertCircle className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{loginError}</p>
              </motion.div>
            )}

            {/* Google Sign In Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-6"
            >
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  text="continue_with"
                  width="100%"
                />
              </div>
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="relative my-6"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with email</span>
              </div>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setLoginError('');
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your email"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setLoginError('');
                    }}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-between"
              >
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-500 hover:text-blue-600 transition-colors"
                >
                  Forgot password?
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                className="flex justify-center"
              >
                <ReCAPTCHA
                  ref={captchaRef}
                  sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                  onChange={(token) => {
                    setCaptchaToken(token);
                    if (token) {
                      setLoginError('');
                    }
                  }}
                  theme="light"
                />
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <FiArrowRight />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="relative my-8"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">New to SkillSwap?</span>
              </div>
            </motion.div>

            {/* Register Link */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Link to="/register">
                <button className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center justify-center gap-2">
                  <FiUser />
                  Create New Account
                </button>
              </Link>
            </motion.div>

            {/* Info Message */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 text-center text-xs text-gray-500"
            >
              <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* OTP Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl max-w-md w-full p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <FiAlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Verify Your Email</h2>
            </div>
            
            <p className="text-gray-600 mb-2">
              Please verify your email to complete login. We've sent a verification code to:
            </p>
            <p className="font-semibold text-blue-600 mb-4 break-all">{unverifiedEmail}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                }}
                className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="000000"
                maxLength={6}
                autoFocus
                disabled={resendLoading}
              />
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={resendLoading || !otp || otp.length !== 6}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {resendLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </div>
              ) : (
                'Verify & Login'
              )}
            </button>

            <div className="mt-4 text-center">
              <button
                onClick={handleResendOTP}
                disabled={resendTimer > 0 || resendLoading}
                className="text-sm text-blue-500 hover:text-blue-600 disabled:text-gray-400 transition-colors"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>

            <button
              onClick={() => {
                setShowVerifyModal(false);
                setOtp('');
              }}
              className="w-full mt-3 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
            >
              Back to Login
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
};
 
export default Login;
