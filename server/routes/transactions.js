const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getTransactions, getTransactionSummary, createTransaction, updateTransaction, deleteTransaction, bulkCreateTransactions } = require('../controllers/transactionController');

router.use(protect);
router.get('/', getTransactions);
router.post('/', createTransaction);
router.post('/bulk', bulkCreateTransactions);
router.get('/summary', getTransactionSummary);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
