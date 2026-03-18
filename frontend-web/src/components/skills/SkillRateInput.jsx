
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiInfo, FiTrendingUp, FiUsers } from 'react-icons/fi';

const SkillRateInput = ({ 
  value, 
  onChange, 
  type = 'teach', // 'teach' or 'learn'
  min = 5,
  max = 500,
  step = 5,
  currency = 'USD'
}) => {
  const [showInfo, setShowInfo] = useState(false);

  // Market rate suggestions based on skill type
  const getMarketRate = () => {
    if (value <= 25) return 'Below Market';
    if (value <= 50) return 'Market Average';
    if (value <= 100) return 'Premium';
    return 'Expert';
  };

  const getRateColor = () => {
    if (type === 'teach') {
      if (value <= 25) return 'text-yellow-600';
      if (value <= 50) return 'text-green-600';
      if (value <= 100) return 'text-blue-600';
      return 'text-purple-600';
    } else {
      // For learning budget
      if (value <= 30) return 'text-green-600';
      if (value <= 60) return 'text-blue-600';
      return 'text-purple-600';
    }
  };

  const getRateMessage = () => {
    if (type === 'teach') {
      switch (getMarketRate()) {
        case 'Below Market':
          return 'Great for building your reputation and getting first students';
        case 'Market Average':
          return 'Competitive rate that attracts quality students';
        case 'Premium':
          return 'Positioning yourself as an expert with premium pricing';
        default:
          return 'Expert rate - students expect exceptional value';
      }
    } else {
      // For learners
      if (value <= 30) return 'Good for finding beginner teachers';
      if (value <= 60) return 'Attracts experienced teachers';
      return 'Connects you with top-rated experts';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {type === 'teach' ? 'Your Hourly Rate' : 'Maximum Budget (per hour)'}
        </label>
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="text-gray-400 hover:text-gray-600"
        >
          <FiInfo className="w-4 h-4" />
        </button>
      </div>

      {/* Rate Input with Currency */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
          {currency === 'USD' ? '$' : currency}
        </span>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || min)}
          className="w-full pl-8 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
          / hour
        </span>
      </div>

      {/* Rate Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(value / max) * 100}%` }}
              className={`h-full ${
                type === 'teach' 
                  ? 'bg-gradient-to-r from-green-500 to-blue-500' 
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
            />
          </div>
        </div>
        <motion.span 
          key={value}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`text-sm font-medium ${getRateColor()}`}
        >
          {getMarketRate()}
        </motion.span>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700"
        >
          <p className="flex items-start gap-2">
            <FiTrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{getRateMessage()}</span>
          </p>
          {type === 'teach' && (
            <p className="flex items-start gap-2 mt-2 text-blue-600">
              <FiUsers className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>After platform fees (10%), you'll receive ${(value * 0.9).toFixed(2)}/hour</span>
            </p>
          )}
        </motion.div>
      )}

      {/* Quick Suggestions */}
      <div className="flex gap-2 mt-2">
        {type === 'teach' ? (
          // Rate suggestions for teachers
          [25, 50, 75, 100].map(rate => (
            <button
              key={rate}
              type="button"
              onClick={() => onChange(rate)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                value === rate
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ${rate}
            </button>
          ))
        ) : (
          // Budget suggestions for learners
          [30, 50, 80, 120].map(budget => (
            <button
              key={budget}
              type="button"
              onClick={() => onChange(budget)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                value === budget
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ${budget}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default SkillRateInput;