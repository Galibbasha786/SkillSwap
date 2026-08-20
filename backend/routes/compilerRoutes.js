const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { runCode, getLanguages } = require('../controllers/compilerController');

router.use(auth);

router.get('/languages', getLanguages);
router.post('/run', runCode);

module.exports = router;
