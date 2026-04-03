// frontend-web/src/components/sessions/BookingModal.jsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiX, 
  FiCalendar, 
  FiClock, 
  FiCreditCard,
  FiVideo,
  FiCheckCircle,
  FiDollarSign,
  FiCopy,
  FiExternalLink,
  FiGift,
  FiStar,
  FiAward
} from 'react-icons/fi';
import { sessionAPI, rewardsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const BookingModal = ({ teacher, skill, onClose, onBooked }) => {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [session, setSession] = useState(null);
  const [upiPaymentData, setUpiPaymentData] = useState(null);
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  // Rewards State
  const [useRewards, setUseRewards] = useState(false);
  const [rewardsBalance, setRewardsBalance] = useState(0);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  useEffect(() => {
    fetchRewardsBalance();
  }, []);

  const fetchRewardsBalance = async () => {
    try {
      const response = await rewardsAPI.getBalance();
      setRewardsBalance(response.data.balance);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  const calculateTotal = () => {
    const hours = duration / 60;
    const subtotal = skill?.hourlyRate * hours;
    const fee = subtotal * 0.1;
    return {
      subtotal: subtotal.toFixed(2),
      fee: fee.toFixed(2),
      total: (subtotal + fee).toFixed(2)
    };
  };

  // ✅ FIXED: Don't create session here when using rewards
  const handleDateTimeSelect = async () => {
    if (!date || !time) {
      toast.error('Please select date and time');
      return;
    }

    try {
      setLoading(true);
      
      const [year, month, day] = date.split('-');
      const [hours, minutes] = time.split(':');
      
      const localDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(minutes)
      );
      
      const sessionData = {
        teacherId: teacher._id,
        skillName: skill.name,
        title: `Learn ${skill.name} with ${teacher.name}`,
        description: `One-on-one session on ${skill.name}`,
        date: localDate.toISOString(),
        duration,
        hourlyRate: skill.hourlyRate
      };

      // ✅ If using rewards, go directly to rewards booking (no session creation)
      if (useRewards && rewardsBalance >= 20) {
        await handleRewardsBooking(sessionData);
      } else {
        // Regular paid session - create session first
        const response = await sessionAPI.create(sessionData);
        console.log('✅ Session created:', response.data);
        setSession(response.data);
        setStep(2);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to process booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle booking with rewards - creates session via rewards API
  const handleRewardsBooking = async (sessionData) => {
    setRewardsLoading(true);
    try {
      const response = await rewardsAPI.redeemFreeSession({
        teacherId: teacher._id,
        skillId: skill._id,
        skillName: skill.name,
        title: sessionData.title,
        description: sessionData.description,
        date: sessionData.date,
        duration: duration,
        hourlyRate: skill.hourlyRate
      });
      
      if (response.data.success) {
        toast.success(`🎉 Free session booked! You used 20 rewards. ${response.data.rewardsLeft} rewards left.`);
        onBooked(response.data.session);
        onClose();
      }
    } catch (error) {
      console.error('Error booking with rewards:', error);
      toast.error(error.response?.data?.message || 'Failed to book with rewards');
    } finally {
      setRewardsLoading(false);
    }
  };

  const handleUPIPayment = async () => {
    if (!upiTransactionId) {
      toast.error('Please enter UPI transaction ID');
      return;
    }
    
    setVerifying(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/verify-upi-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          transactionId: upiPaymentData.id,
          upiTransactionId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Payment verified! Session confirmed.');
        onBooked(session);
        onClose();
      } else {
        toast.error(data.message || 'Verification failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  };

  const createUPIPayment = async () => {
    try {
      setProcessing(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/create-upi-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sessionId: session._id })
      });
      
      const data = await response.json();
      if (data.success) {
        setUpiPaymentData(data.transaction);
      } else {
        toast.error('Failed to create UPI payment');
      }
    } catch (error) {
      console.error('UPI payment error:', error);
      toast.error('Failed to create payment');
    } finally {
      setProcessing(false);
    }
  };

  const totals = calculateTotal();
  const canUseRewards = rewardsBalance >= 20;
  const freeSessionAvailable = canUseRewards;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Book Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="flex p-4 gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full ${
                s <= step ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
            <img 
              src={teacher?.profileImage || 'https://via.placeholder.com/50'} 
              alt={teacher?.name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <p className="font-medium">{teacher?.name}</p>
              <p className="text-sm text-gray-600">Teaching: {skill?.name}</p>
              <p className="text-sm text-green-600 font-medium">₹{skill?.hourlyRate}/hour</p>
            </div>
          </div>

          {/* Rewards Banner */}
          {step === 1 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <FiGift className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-amber-800">Rewards Available!</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-amber-700">You have <span className="font-bold">{rewardsBalance}</span> rewards</p>
                  {freeSessionAvailable && (
                    <p className="text-xs text-amber-600">20 rewards = 1 free session!</p>
                  )}
                </div>
                {freeSessionAvailable && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useRewards}
                      onChange={(e) => setUseRewards(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded"
                    />
                    <span className="text-sm font-medium text-amber-700">Use 20 rewards</span>
                  </label>
                )}
              </div>
              {useRewards && (
                <div className="mt-2 p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-700 flex items-center gap-1">
                    <FiAward className="w-3 h-3" />
                    Free session! No payment required. Teacher gets 10 bonus rewards.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

              {!useRewards && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Rate:</span>
                    <span className="font-medium">₹{skill?.hourlyRate}/hour</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{duration} minutes</span>
                  </div>
                  <div className="border-t border-blue-200 my-2 pt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span className="text-green-600">₹{totals.total}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Includes 10% platform fee</p>
                  </div>
                </div>
              )}

              {useRewards && (
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-center">
                    <FiGift className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-bold text-green-700">Free Session!</p>
                    <p className="text-sm text-green-600">Using 20 rewards points</p>
                    <p className="text-xs text-green-500 mt-1">Rewards left after booking: {rewardsBalance - 20}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleDateTimeSelect}
                disabled={loading || rewardsLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
              >
                {loading || rewardsLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {useRewards ? 'Booking Free Session...' : 'Creating Session...'}
                  </div>
                ) : (
                  useRewards ? 'Book Free Session with Rewards' : 'Continue to Payment'
                )}
              </button>
            </div>
          )}

          {step === 2 && session && !useRewards && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({duration} mins)</span>
                  <span className="font-medium">₹{totals.subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Platform fee (10%)</span>
                  <span className="font-medium">₹{totals.fee}</span>
                </div>
                <div className="border-t border-gray-200 my-2 pt-2">
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-green-600">₹{totals.total}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FiVideo className="text-blue-500" />
                  <span className="text-sm font-medium">Video Call Session</span>
                </div>
                <FiCheckCircle className="text-green-500" />
              </div>

              {/* UPI Payment Option */}
              {!upiPaymentData ? (
                <button
                  onClick={createUPIPayment}
                  disabled={processing}
                  className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  {processing ? 'Creating payment...' : 'Pay with UPI'}
                </button>
              ) : (
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold text-center">Scan QR to Pay</h3>
                  
                  <div className="text-center">
                    <img 
                      src={upiPaymentData.upiQRCode} 
                      alt="UPI QR Code" 
                      className="w-48 h-48 mx-auto border rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-2">Scan with any UPI app</p>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Pay to UPI ID:</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="font-mono font-medium">{upiPaymentData.upiId}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(upiPaymentData.upiId);
                          toast.success('UPI ID copied!');
                        }}
                        className="text-blue-500 hover:text-blue-600"
                      >
                        <FiCopy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Amount to Pay</p>
                    <p className="text-2xl font-bold text-green-600">₹{upiPaymentData.amount}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UPI Transaction ID
                    </label>
                    <input
                      type="text"
                      value={upiTransactionId}
                      onChange={(e) => setUpiTransactionId(e.target.value)}
                      placeholder="Enter transaction ID after payment"
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <button
                    onClick={handleUPIPayment}
                    disabled={verifying}
                    className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {verifying ? 'Verifying...' : 'Verify Payment'}
                  </button>
                  
                  <button
                    onClick={() => setUpiPaymentData(null)}
                    className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Back
                  </button>
                </div>
              )}

              <button
                onClick={() => setStep(1)}
                className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Back to Edit
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BookingModal;