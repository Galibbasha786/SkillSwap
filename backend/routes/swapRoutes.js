// backend/routes/swapRoutes.js

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createFreeSwap,
  getPendingSwaps,
  getCompletedSwaps
} = require('../controllers/swapController');

router.use(auth);

router.post('/create', createFreeSwap);
router.get('/pending', getPendingSwaps);
router.get('/completed', getCompletedSwaps);

module.exports = router;