const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getVideos, searchVideos } = require('../controllers/videoController');

router.use(protect);

router.get('/', getVideos);
router.get('/search', searchVideos);

module.exports = router;
