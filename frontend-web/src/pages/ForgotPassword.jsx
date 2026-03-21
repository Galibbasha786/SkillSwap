// frontend-web/src/pages/ForgotPassword.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiArrowLeft, FiCheckCircle, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();

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

  const handleSendOTP = async (e) => {
  e.preventDefault();
  if (!email) {
    toast.error('Please enter your email');
    return;
  }

  setLoading(true);
  try {
    // ✅ Send OTP with type 'reset'
    await authAPI.sendOTP({ email, type: 'reset' });
    toast.success('OTP sent to your email');
    setStep(2);
    setResendTimer(60);
    startTimer();
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to send OTP');
  } finally {
    setLoading(false);
  }
};


const handleVerifyOTP = async (e) => {
  e.preventDefault();
  if (!otp || otp.length !== 6) {
    toast.error('Please enter 6-digit OTP');
    return;
  }

  setLoading(true);
  try {
    // ✅ Verify OTP with type 'reset' - this should NOT clear the OTP
    await authAPI.verifyOTP({ email, otp, type: 'reset' });
    toast.success('OTP verified');
    setStep(3);
  } catch (error) {
    toast.error(error.response?.data?.message || 'Invalid OTP');
  } finally {
    setLoading(false);
  }
};


  const handleResetPassword = async (e) => {
  e.preventDefault();
  
  if (newPassword !== confirmPassword) {
    toast.error('Passwords do not match');
    return;
  }
  if (newPassword.length < 6) {
    toast.error('Password must be at least 6 characters');
    return;
  }

  setLoading(true);
  try {
    // ✅ Send the same OTP with the new password
    await authAPI.resetPassword({ email, otp, newPassword });
    toast.success('Password reset successful! Please login.');
    navigate('/login');
  } catch (error) {
    toast.error(error.response?.data?.message || 'Failed to reset password');
  } finally {
    setLoading(false);
  }
};

  const handleResendOTP = async () => {
    if (resendTimer > 0) {
      toast.error(`Please wait ${resendTimer} seconds`);
      return;
    }

    setLoading(true);
    try {
      await authAPI.sendOTP({ email, type: 'reset' });
      toast.success('OTP resent');
      setResendTimer(60);
      startTimer();
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float animation-delay-2000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          <Link to="/login" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <FiArrowLeft /> Back to Login
          </Link>

          <h1 className="text-3xl font-bold gradient-text mb-2">
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Enter OTP'}
            {step === 3 && 'Reset Password'}
          </h1>
          <p className="text-gray-600 mb-6">
            {step === 1 && 'Enter your email to receive a reset code'}
            {step === 2 && `We've sent a 6-digit code to ${email}`}
            {step === 3 && 'Enter your new password'}
          </p>

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-6">
              <div>
                <label className="input-label">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div>
                <label className="input-label">6-Digit OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="input-field text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Verify OTP'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendTimer > 0}
                className="w-full text-sm text-blue-500 hover:text-blue-600 disabled:text-gray-400"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="input-label">New Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Enter new password"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="input-label">Confirm Password</label>
                <div className="relative">
                  <FiCheckCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Confirm new password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheckCircle />
                    Reset Password
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;