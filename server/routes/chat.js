const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { chat } = require('../controllers/chatController');

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  message: { message: 'Too many chat requests. Please try again in a minute.' },
});

router.use(protect);
router.post('/', chatLimiter, chat);

module.exports = router;
