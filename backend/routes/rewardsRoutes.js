// backend/routes/rewardsRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getRewardsBalance,
  getRewardsHistory,
  redeemFreeSession
} = require('../controllers/rewardsController');

router.use(auth);

router.get('/balance', getRewardsBalance);
router.get('/history', getRewardsHistory);
router.post('/redeem-free-session', redeemFreeSession);

module.exports = router;