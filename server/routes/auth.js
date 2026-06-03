const express = require('express');
const router = express.Router();
const { signup, login, me, updateName, updatePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, me);
router.put('/update-name', protect, updateName);
router.put('/update-password', protect, updatePassword);

module.exports = router;