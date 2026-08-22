// backend/utils/walletHelper.js

const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const { createNotification } = require('../controllers/notificationController');

const AUTO_WITHDRAW_THRESHOLD = parseFloat(process.env.WALLET_AUTO_WITHDRAW_THRESHOLD || '5000');
const MIN_WITHDRAWAL = parseFloat(process.env.WALLET_MIN_WITHDRAWAL || '50');

const creditTeacherWallet = async (teacherId, session) => {
  const earnings = session.teacherEarnings ?? session.totalAmount * 0.9;
  const teacher = await User.findByIdAndUpdate(
    teacherId,
    {
      $inc: {
        'wallet.balance': earnings,
        totalEarnings: earnings,
      },
      $set: { 'wallet.lastTransactionAt': new Date() },
    },
    { new: true }
  );

  if (teacher) {
    await maybeAutoWithdraw(teacher);
  }
  return teacher;
};

const creditLearnerRefund = async (learnerId, amount) => {
  await User.findByIdAndUpdate(learnerId, {
    $inc: { 'wallet.balance': amount },
    $set: { 'wallet.lastTransactionAt': new Date() },
  });
};

const reverseTeacherEarnings = async (teacherId, session) => {
  const earnings = session.teacherEarnings ?? session.totalAmount * 0.9;
  const teacher = await User.findById(teacherId);
  if (!teacher) return;

  const deduct = Math.min(teacher.wallet?.balance || 0, earnings);
  teacher.wallet.balance = (teacher.wallet?.balance || 0) - deduct;
  teacher.totalEarnings = Math.max(0, (teacher.totalEarnings || 0) - earnings);
  await teacher.save({ validateBeforeSave: false });
};

const maybeAutoWithdraw = async (user) => {
  if (!AUTO_WITHDRAW_THRESHOLD || AUTO_WITHDRAW_THRESHOLD <= 0) return null;

  const balance = user.wallet?.balance || 0;
  if (balance < AUTO_WITHDRAW_THRESHOLD) return null;

  const upiId = user.upiId || user.bankAccount?.upiId;
  const hasBank = Boolean(user.bankAccount?.accountNumber && user.bankAccount?.ifscCode);
  if (!upiId && !hasBank) return null;

  const pending = await Withdrawal.findOne({ userId: user._id, status: 'pending' });
  if (pending) return null;

  const amount = Math.floor(balance);
  if (amount < MIN_WITHDRAWAL) return null;

  const withdrawal = await Withdrawal.create({
    userId: user._id,
    amount,
    paymentMethod: upiId ? 'upi' : 'bank',
    upiId: upiId || undefined,
    bankInfo: hasBank ? user.bankAccount : undefined,
    status: 'pending',
    autoRequested: true,
  });

  user.wallet.balance -= amount;
  user.wallet.pendingWithdrawals = (user.wallet.pendingWithdrawals || 0) + amount;
  await user.save({ validateBeforeSave: false });

  try {
    await createNotification(
      user._id,
      'withdrawal_requested',
      'Auto withdrawal requested',
      `Your wallet reached ₹${AUTO_WITHDRAW_THRESHOLD}. A withdrawal of ₹${amount} was submitted automatically.`,
      { withdrawalId: withdrawal._id, amount }
    );
  } catch (_) {
    /* non-blocking */
  }

  return withdrawal;
};

const completeSessionPayment = async (session) => {
  await User.findByIdAndUpdate(session.learnerId, {
    $inc: { totalSpent: session.totalAmount },
  });
  await creditTeacherWallet(session.teacherId, session);
};

module.exports = {
  creditTeacherWallet,
  creditLearnerRefund,
  reverseTeacherEarnings,
  maybeAutoWithdraw,
  completeSessionPayment,
};
