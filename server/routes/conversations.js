const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listConversations,
  createUserConversation,
  getConversation,
  renameConversation,
  deleteConversation,
  deleteAllConversations,
} = require('../controllers/conversationController');

router.use(protect);

router.get('/', listConversations);
router.post('/', createUserConversation);
router.get('/:id', getConversation);
router.patch('/:id', renameConversation);
router.delete('/', deleteAllConversations);
router.delete('/:id', deleteConversation);

module.exports = router;
