// frontend-web/src/components/wallet/WalletBalance.jsx

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiArrowUp, FiArrowDown, FiTrendingUp } from 'react-icons/fi';
import { walletAPI } from '../../services/api';
import toast from 'react-hot-toast';

const WalletBalance = ({ layout = 'full' }) => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: ''
  });
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await walletAPI.getBalance();
      setWallet(response.data);
    } catch (error) {
      console.error('Wallet error:', error);
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) < 50) {
      toast.error('Minimum withdrawal amount is ₹50');
      return;
    }

    if (parseFloat(withdrawAmount) > wallet?.balance) {
      toast.error('Insufficient balance');
      return;
    }

    setWithdrawing(true);
    try {
      const response = await walletAPI.requestWithdrawal({
        amount: parseFloat(withdrawAmount),
        paymentMethod: withdrawMethod,
        ...(withdrawMethod === 'upi' ? { upiId } : { bankDetails })
      });
      
      toast.success(response.data.message);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setUpiId('');
      setBankDetails({
        accountHolderName: '',
        bankName: '',
        accountNumber: '',
        ifscCode: ''
      });
      fetchWallet();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to request withdrawal');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    if (layout === 'transactions-only') {
      return (
        <div className="bg-white rounded-xl shadow-md p-6 animate-pulse h-full min-h-[280px]">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="space-y-3">
            <div className="h-12 bg-gray-200 rounded" />
            <div className="h-12 bg-gray-200 rounded" />
            <div className="h-12 bg-gray-200 rounded" />
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse h-full">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  const walletCard = (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all group h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="p-3 bg-green-100 rounded-lg group-hover:scale-110 transition-transform">
          <FiDollarSign className="w-6 h-6 text-green-600" />
        </div>
        {wallet?.balance >= 50 && (
          <button
            type="button"
            onClick={() => setShowWithdrawModal(true)}
            className="text-xs bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition-colors"
          >
            Withdraw
          </button>
        )}
      </div>

      <div className="flex-1">
        <p className="text-gray-500 text-sm mb-1">Wallet Balance</p>
        <p className="text-2xl font-bold text-gray-900">₹{wallet?.balance?.toFixed(2)}</p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Total Earned</p>
            <p className="text-sm font-semibold text-gray-700">₹{wallet?.totalEarnings?.toFixed(2) || 0}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Pending Withdrawal</p>
            <p className="text-sm font-semibold text-gray-700">₹{wallet?.pendingWithdrawals?.toFixed(2) || 0}</p>
          </div>
        </div>
        {wallet?.balance >= 5000 && (
          <p className="text-xs text-amber-600 mt-2">
            Balance at or above ₹5,000 — an auto-withdrawal may be created if UPI/bank details are saved.
          </p>
        )}
      </div>
    </div>
  );

  const transactionsPanel = (
    <div className="bg-white rounded-xl shadow-md p-6 h-full flex flex-col min-h-[280px]">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
      <div className="space-y-3 flex-1 overflow-y-auto max-h-72">
        {wallet?.recentTransactions?.length > 0 ? (
          wallet.recentTransactions.slice(0, 5).map((tx, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 border border-gray-100 hover:bg-gray-50 transition-colors rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                    tx.learnerId?._id === wallet?.userId ? 'bg-red-100' : 'bg-green-100'
                  }`}
                >
                  {tx.learnerId?._id === wallet?.userId ? (
                    <FiArrowUp className="w-4 h-4 text-red-500" />
                  ) : (
                    <FiArrowDown className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {tx.sessionId?.title || tx.description || 'Session Payment'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <span
                className={`font-semibold shrink-0 ml-2 ${
                  tx.learnerId?._id === wallet?.userId ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {tx.learnerId?._id === wallet?.userId ? '-' : '+'}₹{tx.amount?.toFixed(2)}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500 flex flex-col items-center justify-center h-full">
            <FiTrendingUp className="w-12 h-12 mb-2 text-gray-300" />
            <p>No transactions yet</p>
            <p className="text-xs mt-1">Book sessions to see earnings</p>
          </div>
        )}
      </div>
    </div>
  );

  const withdrawModal = showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-4">Request Withdrawal</h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-700">
                💰 <strong>Withdraw your earnings</strong> - Money will be sent to your bank account or UPI ID.
                No payment required from you. We transfer the money to you.
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Available Balance: <span className="font-semibold text-green-600">₹{wallet?.balance?.toFixed(2)}</span>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount to Withdraw (Min ₹100)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter amount"
                min="100"
                max={wallet?.balance}
                step="50"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={withdrawMethod}
                onChange={(e) => setWithdrawMethod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="upi">UPI ID</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            
            {withdrawMethod === 'upi' ? (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Your UPI ID</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="example@okhdfcbank"
                />
                <p className="text-xs text-gray-500 mt-1">We'll transfer money to this UPI ID</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={bankDetails.accountHolderName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={bankDetails.ifscCode}
                      onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700">
                ⏱️ <strong>Processing Time:</strong> 24-48 hours after approval.
                You'll receive a notification when money is sent.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {withdrawing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Request Withdrawal'
                )}
              </button>
            </div>
          </motion.div>
        </div>
  );

  if (layout === 'card-only') {
    return (
      <>
        {walletCard}
        {withdrawModal}
      </>
    );
  }

  if (layout === 'transactions-only') {
    return transactionsPanel;
  }

  return (
    <>
      {walletCard}
      <div className="mt-6">{transactionsPanel}</div>
      {withdrawModal}
    </>
  );
};

export default WalletBalance;