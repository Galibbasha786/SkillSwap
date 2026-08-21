// frontend-web/src/components/rewards/RewardsCard.jsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiGift, 
  FiStar, 
  FiClock, 
  FiAward, 
  FiTrendingUp,
  FiList,
  FiX
} from 'react-icons/fi';
import { rewardsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const RewardsCard = () => {
  const [rewards, setRewards] = useState({ balance: 0, totalEarned: 0, totalRedeemed: 0 });
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const [balanceRes, historyRes] = await Promise.all([
        rewardsAPI.getBalance(),
        rewardsAPI.getHistory()
      ]);
      setRewards(balanceRes.data);
      setHistory(historyRes.data.transactions || []);
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const progress = (rewards.balance / 20) * 100;
  const rewardsNeeded = 20 - rewards.balance;

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-lg overflow-hidden flex flex-col">
      <div className="p-6 text-white flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiAward className="w-6 h-6" />
            <h3 className="text-lg font-semibold">Rewards Program</h3>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-white/80 hover:text-white flex items-center gap-1"
          >
            <FiList className="w-3 h-3" />
            {showHistory ? 'Hide' : 'History'}
          </button>
        </div>

        <div className="text-center mb-4">
          <div className="text-4xl font-bold">{rewards.balance}</div>
          <p className="text-white/80 text-sm">Reward Points</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress to Free Session</span>
            <span>{rewards.balance}/20</span>
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-300 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          {rewardsNeeded > 0 ? (
            <p className="text-xs text-white/70 mt-1">{rewardsNeeded} more sessions to get a free session!</p>
          ) : (
            <p className="text-xs text-yellow-200 mt-1 font-medium">🎉 You have enough rewards for a free session!</p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/20">
          <div className="text-center">
            <p className="text-2xl font-bold">{rewards.totalEarned}</p>
            <p className="text-xs text-white/70">Total Earned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{rewards.totalRedeemed}</p>
            <p className="text-xs text-white/70">Total Redeemed</p>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="bg-white p-4 border-t">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-gray-900">Rewards History</h4>
            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-4 h-4" />
            </button>
          </div>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">No rewards history yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {history.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {item.type === 'earned' ? (
                      <FiStar className="w-4 h-4 text-green-500" />
                    ) : item.type === 'redeemed' ? (
                      <FiGift className="w-4 h-4 text-orange-500" />
                    ) : (
                      <FiAward className="w-4 h-4 text-blue-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${
                    item.type === 'earned' ? 'text-green-600' : 
                    item.type === 'redeemed' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {item.type === 'earned' ? '+' : '-'}{item.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RewardsCard;