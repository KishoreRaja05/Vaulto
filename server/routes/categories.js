const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listCategories,
  createCategory,
  deleteCategory,
} = require('../controllers/categoryController');

router.use(protect);

router.get('/', listCategories);
router.post('/', createCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
