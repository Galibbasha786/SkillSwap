// frontend-web/src/pages/Login.jsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { FiMail, FiLock, FiArrowRight, FiUser, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

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
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

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
    
    // Clear previous error
    setLoginError('');
    
    // Basic validation
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
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLoginError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await login(email, password);
      
      if (result.success && result.user) {
        // Save email if remember me is checked
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        
        // Role-based redirect
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
      
      // Handle specific error cases
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
    
    // OTP format validation (only numbers)
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
        
        // Auto login after verification
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
        
        // Role-based redirect
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
    toast.error('Google login failed. Please try again or use email login.');
    setLoginError('Google login failed. Please try again or use email login.');
  };

  const handleForgotPassword = () => {
    if (!email) {
      toast.error('Please enter your email address to reset password');
      return;
    }
    navigate('/forgot-password', { state: { email } });
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        {/* Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float animation-delay-4000"></div>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-600">Sign in to continue your learning journey</p>
            </motion.div>

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
                  useOneTap
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
                <span className="px-4 bg-white/80 text-gray-500">Or continue with email</span>
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
                      setLoginError(''); // Clear error on input change
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
                      setLoginError(''); // Clear error on input change
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
                <span className="px-4 bg-white/80 text-gray-500">New to SkillSwap?</span>
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

      {/* OTP Verification Modal (for login with unverified email) */}
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