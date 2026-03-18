// frontend-web/src/components/sessions/BookingModal.jsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiX, 
  FiCalendar, 
  FiClock, 
  FiCreditCard,
  FiVideo,
  FiCheckCircle,
  FiDollarSign
} from 'react-icons/fi';
import { sessionAPI } from '../../services/api';
import toast from 'react-hot-toast';

const BookingModal = ({ teacher, skill, onClose, onBooked }) => {
  const [step, setStep] = useState(1);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [session, setSession] = useState(null);

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

  const handleDateTimeSelect = async () => {
    if (!date || !time) {
      toast.error('Please select date and time');
      return;
    }

    try {
      setLoading(true);
      
      const sessionData = {
        teacherId: teacher._id,
        skillName: skill.name,
        title: `Learn ${skill.name} with ${teacher.name}`,
        description: `One-on-one session on ${skill.name}`,
        date: `${date}T${time}:00.000Z`,
        duration,
        hourlyRate: skill.hourlyRate
      };

      console.log('Creating session with data:', sessionData);
      
      const response = await sessionAPI.create(sessionData);
      console.log('✅ Session created:', response.data);
      
      setSession(response.data);
      setStep(2);
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async () => {
    try {
      setProcessing(true);
      
      // Load Razorpay script if not already loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway');
        setProcessing(false);
        return;
      }
      
      // Create order in backend
      const orderResponse = await fetch('http://localhost:5001/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sessionId: session._id })
      });
      
      const orderData = await orderResponse.json();
      
      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }
      
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'SkillSwap',
        description: `Session with ${teacher.name}`,
        image: 'https://skillswap.com/logo.png', // Add your logo URL
        order_id: orderData.orderId,
        handler: async function(response) {
          // Verify payment
          const verifyResponse = await fetch('http://localhost:5001/api/razorpay/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              sessionId: session._id
            })
          });
          
          const verifyData = await verifyResponse.json();
          
          if (verifyData.success) {
            toast.success('Payment successful! Session booked.');
            onBooked(session);
            onClose();
          } else {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: teacher.name,
          email: teacher.email,
          contact: '9999999999' // You can collect this from user
        },
        notes: {
          address: 'SkillSwap Session'
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            setProcessing(false);
            toast('Payment cancelled', { icon: '❌' });
          }
        }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const totals = calculateTotal();

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

          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
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
                  required
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
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (minutes)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>

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
                  <p className="text-xs text-gray-500 mt-1">
                    Includes 10% platform fee
                  </p>
                </div>
              </div>

              <button
                onClick={handleDateTimeSelect}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Session...
                  </div>
                ) : (
                  'Continue to Payment'
                )}
              </button>
            </motion.div>
          )}

          {step === 2 && session && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
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

              <button
                onClick={handleRazorpayPayment}
                disabled={processing}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FiDollarSign />
                    Pay ₹{totals.total} with Razorpay
                  </>
                )}
              </button>

              <button
                onClick={() => setStep(1)}
                disabled={processing}
                className="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Back to Edit
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BookingModal;