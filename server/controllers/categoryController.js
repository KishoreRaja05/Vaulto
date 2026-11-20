const supabase = require('../utils/supabase');
const {
  DEFAULT_CATEGORIES,
  cleanCategoryName,
  ensureCategoryWithStatus,
  getCategoriesForUser,
  isValidType,
} = require('../utils/categories');

const isValidationError = (message) =>
  message.startsWith('category must') || message.startsWith('type must');

const listCategories = async (req, res) => {
  const type = String(req.query.type || '').trim().toLowerCase();
  if (!isValidType(type)) {
    return res.status(400).json({ message: 'type must be income or expense' });
  }

  try {
    const rows = await getCategoriesForUser(req.user.id, type);
    res.json({
      defaults: [...DEFAULT_CATEGORIES[type]],
      custom: rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        createdAt: row.createdAt || null,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createCategory = async (req, res) => {
  const type = String(req.body?.type || '').trim().toLowerCase();
  const name = cleanCategoryName(req.body?.name);

  try {
    const result = await ensureCategoryWithStatus(req.user.id, name, type);
    const category = {
      id: result.id,
      name: result.name,
      type,
      createdAt: null,
    };
    res.status(result.created ? 201 : 200).json({ category, name: result.name, created: result.created });
  } catch (err) {
    if (isValidationError(err.message)) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'Category id is required' });

  try {
    // Only rows in Category (custom categories) are removed. Defaults are
    // hardcoded and never stored, so they cannot be deleted here. The userId
    // filter guarantees ownership; a missing/foreign row is reported as 404.
    // Transaction.category is plain text and is deliberately left untouched.
    const { data, error } = await supabase
      .from('Category')
      .delete()
      .eq('id', id)
      .eq('userId', req.user.id)
      .select('id');
    if (error) throw error;
    if (!data || !data.length) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { listCategories, createCategory, deleteCategory };
