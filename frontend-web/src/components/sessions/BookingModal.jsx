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
  FiGift,
  FiStar,
  FiAward,
  FiAlertCircle
} from 'react-icons/fi';
import { sessionAPI, rewardsAPI, timeSlotAPI, razorpayAPI } from '../../services/api';
import { loadRazorpay, openRazorpayCheckout } from '../../utils/loadRazorpay';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const BookingModal = ({ teacher, skill, onClose, onBooked, existingSession = null }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(existingSession ? 2 : 1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(existingSession || null);
  const [paying, setPaying] = useState(false);
  
  // Rewards State
  const [useRewards, setUseRewards] = useState(false);
  const [rewardsBalance, setRewardsBalance] = useState(0);
  const [rewardsLoading, setRewardsLoading] = useState(false);

  // Time Slots State
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    fetchRewardsBalance();
    if (existingSession?.duration) {
      setDuration(existingSession.duration);
    }
  }, [existingSession?.duration]);

  const refreshSessionStatus = async () => {
    if (!session?._id) return;
    try {
      const response = await sessionAPI.getById(session._id);
      setSession(response.data);
      if (response.data.approvalStatus === 'approved') {
        toast.success('Teacher approved! You can complete payment.');
      } else if (response.data.approvalStatus === 'declined') {
        toast.error('Teacher declined this booking request.');
      }
    } catch (error) {
      toast.error('Could not refresh booking status');
    }
  };

  const fetchRewardsBalance = async () => {
    try {
      const response = await rewardsAPI.getBalance();
      setRewardsBalance(response.data.balance);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  // Fetch available time slots when date changes
  const handleDateChange = async (selectedDate) => {
    setDate(selectedDate);
    setTime('');
    setSelectedSlot(null);
    
    if (!selectedDate) {
      setAvailableTimeSlots([]);
      return;
    }

    try {
      setCheckingAvailability(true);
      const response = await timeSlotAPI.getAvailableSlotsForWeek(teacher._id, selectedDate);
      setAvailableTimeSlots((response.data.availableSlots || []).filter((slot) => !slot.isBooked));
      
      if (!response.data.availableSlots || response.data.availableSlots.length === 0) {
        toast.info(`No available time slots for ${response.data.dayOfWeek}`);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableTimeSlots([]);
      // Non-fatal error - teacher may not have set up time slots yet
      toast.warning('Teacher has not set specific time slots yet. You can suggest a time.');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const calculateTotal = () => {
    if (session?.totalAmount != null) {
      const total = Number(session.totalAmount);
      const fee = Number(session.platformFee ?? total * 0.1);
      const subtotal = total - fee;
      return {
        subtotal: subtotal.toFixed(2),
        fee: fee.toFixed(2),
        total: total.toFixed(2),
      };
    }

    const hours = duration / 60;
    const total = skill?.hourlyRate * hours;
    const fee = total * 0.1;
    const subtotal = total - fee;
    return {
      subtotal: subtotal.toFixed(2),
      fee: fee.toFixed(2),
      total: total.toFixed(2),
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
        setSession(response.data);
        setStep(2);
        toast.success('Booking request sent to teacher!');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Failed to process booking. Please try again.');
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

  const canPaySession = (s) =>
    s &&
    s.paymentStatus !== 'completed' &&
    s.approvalStatus !== 'pending' &&
    s.approvalStatus !== 'declined' &&
    (s.approvalStatus === 'approved' || s.approvalStatus == null);

  const handleRazorpayPayment = async () => {
    if (!session?._id || paying) return;

    setPaying(true);
    let latestSession = session;

    try {
      const latest = await sessionAPI.getById(session._id);
      latestSession = latest.data;
      setSession(latestSession);

      if (latestSession.approvalStatus === 'pending') {
        toast.error('Teacher has not approved this booking yet.');
        return;
      }
      if (latestSession.approvalStatus === 'declined') {
        toast.error('This booking was declined.');
        return;
      }
      if (latestSession.paymentStatus === 'completed') {
        toast.success('Session is already paid.');
        onBooked(latestSession);
        onClose();
        return;
      }

      const scriptLoaded = await loadRazorpay();
      if (!scriptLoaded || !window.Razorpay) {
        toast.error('Could not load Razorpay checkout. Disable ad-blockers and retry.');
        return;
      }

      const orderRes = await razorpayAPI.createOrder(latestSession._id);
      const payload = orderRes.data;

      if (!payload?.success) {
        toast.error(payload?.message || 'Failed to create payment order.');
        return;
      }

      const { orderId, amount, currency, keyId } = payload;
      if (!orderId || !keyId || !amount) {
        toast.error('Invalid payment order from server. Check Razorpay keys in backend .env');
        return;
      }

      setPaying(false);

      const result = await openRazorpayCheckout({
        key: keyId,
        amount: Number(amount),
        currency: currency || 'INR',
        name: 'SkillSwap',
        description: latestSession.title || `Learn ${skill?.name || 'a skill'}`,
        order_id: orderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        theme: { color: '#4f46e5' },
        modal: {
          ondismiss: () => toast('Payment window closed'),
        },
      });

      if (result.type === 'dismissed') {
        return;
      }

      setPaying(true);
      const { response } = result;

      const verifyRes = await razorpayAPI.verifyPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
        sessionId: latestSession._id,
      });

      if (verifyRes.data.success) {
        toast.success('Payment successful! Your session is confirmed.');
        onBooked({ ...latestSession, paymentStatus: 'completed' });
        onClose();
      } else {
        toast.error(verifyRes.data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Razorpay payment error:', error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to start payment';
      toast.error(msg);
    } finally {
      setPaying(false);
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Available Time Slots */}
              {date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Available Time Slots
                  </label>
                  {checkingAvailability ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                    </div>
                  ) : availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {availableTimeSlots.map((slot, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedSlot(slot);
                            setTime(slot.startTime);
                          }}
                          className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedSlot?._id === slot._id
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-500'
                          }`}
                        >
                          {slot.startTime} - {slot.endTime}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex gap-2">
                      <FiAlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-amber-800 dark:text-amber-200">No scheduled time slots for this day</p>
                        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">You can still suggest a time below</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {availableTimeSlots.length > 0 ? 'Or select another time' : 'Select Time'}
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                  useRewards ? 'Book Free Session with Rewards' : 'Send Booking Request'
                )}
              </button>
            </div>
          )}

          {step === 2 && session && !useRewards && (
            <div className="space-y-4">
              {session.approvalStatus === 'pending' && (
                <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <FiClock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-blue-900">Waiting for teacher approval</h3>
                      <p className="text-sm text-blue-800 mt-1">
                        {teacher?.name} must accept your request before you can pay.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={refreshSessionStatus}
                    className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
                  >
                    Check approval status
                  </button>
                </div>
              )}

              {session.approvalStatus === 'declined' && (
                <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
                  <p className="font-semibold text-red-800">Booking declined</p>
                  <p className="text-sm text-red-700 mt-1">
                    {session.declineReason || 'The teacher declined this request.'}
                  </p>
                </div>
              )}

              {canPaySession(session) && (
                <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <FiCheckCircle className="text-green-600" />
                <span className="text-sm font-medium text-green-800">Approved — complete payment below</span>
              </div>
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

              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-2">
                  <FiCreditCard className="text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-900">Secure payment via Razorpay</span>
                </div>
                <span className="text-xs text-indigo-600 font-medium">UPI · Card · Netbanking</span>
              </div>

              <button
                onClick={handleRazorpayPayment}
                disabled={paying}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {paying ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Opening Razorpay…
                  </>
                ) : (
                  <>
                    <FiCreditCard className="w-5 h-5" />
                    Pay ₹{totals.total} with Razorpay
                  </>
                )}
              </button>

              <p className="text-xs text-center text-gray-500">
                You will be redirected to Razorpay to complete payment securely.
              </p>

                </>
              )}

              {session.paymentStatus === 'completed' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <FiCheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Payment complete — session confirmed!</p>
                </div>
              )}

              {session.approvalStatus === 'pending' && (
              <button
                onClick={onClose}
                className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Close — we'll notify you when approved
              </button>
              )}

              {canPaySession(session) && (
              <button
                onClick={() => setStep(1)}
                className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Back to Edit
              </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BookingModal;