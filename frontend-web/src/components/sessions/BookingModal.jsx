// frontend-web/src/components/sessions/BookingModal.jsx

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiX, 
  FiCalendar, 
  FiClock, 
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

      const response = await sessionAPI.create(sessionData);
      setSession(response.data);
      setStep(2);
    } catch (error) {
      toast.error('Failed to create session');
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
      
      await loadRazorpayScript();
      
      const orderResponse = await fetch('http://localhost:5001/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ sessionId: session._id })
      });
      
      const orderData = await orderResponse.json();
      
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'SkillSwap',
        description: `Session with ${teacher.name}`,
        order_id: orderData.orderId,
        handler: async function(response) {
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
            toast.success('Google Meet link generated', { icon: '🔗' });
            onBooked(session);
            onClose();
          }
        },
        prefill: {
          name: teacher.name,
          email: teacher.email
        },
        theme: { color: '#3B82F6' }
      };
      
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error('Payment failed');
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
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
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
          {/* Teacher Info */}
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
            <div className="space-y-4">
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <select
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span className="text-green-600">₹{totals.total}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Includes 10% platform fee</p>
              </div>

              <button
                onClick={handleDateTimeSelect}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg"
              >
                {loading ? 'Creating...' : 'Continue to Payment'}
              </button>
            </div>
          )}

          {step === 2 && session && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span>Total</span>
                  <span className="font-bold text-green-600">₹{totals.total}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FiVideo className="text-blue-500" />
                  <span>Google Meet Session</span>
                </div>
                <FiCheckCircle className="text-green-500" />
              </div>

              {session.meetLink && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-700">✅ Meet link ready:</p>
                  <p className="text-xs text-green-600 break-all">{session.meetLink}</p>
                </div>
              )}

              <button
                onClick={handleRazorpayPayment}
                disabled={processing}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg"
              >
                {processing ? 'Processing...' : `Pay ₹${totals.total}`}
              </button>

              <button
                onClick={() => setStep(1)}
                className="w-full py-2 text-gray-600 text-sm"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BookingModal;