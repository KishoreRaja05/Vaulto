const supabase = require('../utils/supabase');
const { ensureCategoryWithStatus } = require('../utils/categories');

const ALLOWED_TYPES = ['income', 'expense'];
const MAX_DESCRIPTION_LENGTH = 500;

const isValidationError = (message) =>
  message.startsWith('category must') || message.startsWith('type must');

const isValidIsoDate = (value) => {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)) return false;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return false;
  return !value.includes('T') || !Number.isNaN(Date.parse(value));
};

// A date-only value like "2026-11-20" must not be read as UTC midnight by
// clients in negative offsets. Store it at noon UTC so it stays the same
// calendar day everywhere. Full timestamps are kept as-is.
const normalizeStoredDate = (value) => {
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00.000Z` : text;
};

const validateTransactionFields = (body, { partial = false } = {}) => {
  const source = body || {};
  const has = (key) => Object.prototype.hasOwnProperty.call(source, key);
  const errors = [];
  const fields = {};

  if (has('amount') || !partial) {
    const amount = Number(source.amount);
    if (!Number.isFinite(amount) || amount <= 0) errors.push('amount must be a number greater than 0');
    else fields.amount = amount;
  }

  if (has('type') || !partial) {
    if (!ALLOWED_TYPES.includes(source.type)) errors.push('type must be income or expense');
    else fields.type = source.type;
  }

  if (has('category') || !partial) {
    if (typeof source.category !== 'string' || !source.category.trim()) {
      errors.push('category must be a non-empty string');
    } else {
      fields.category = source.category;
    }
  }

  if (has('date')) {
    if (!isValidIsoDate(source.date)) errors.push('date must be a valid ISO date (YYYY-MM-DD or full ISO timestamp)');
    else fields.date = normalizeStoredDate(source.date);
  }

  if (has('description')) {
    if (source.description === null || source.description === undefined) {
      fields.description = '';
    } else if (typeof source.description !== 'string') {
      errors.push('description must be a string');
    } else if (source.description.length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`description must be at most ${MAX_DESCRIPTION_LENGTH} characters`);
    } else {
      fields.description = source.description;
    }
  } else if (!partial) {
    fields.description = '';
  }

  return { errors, fields };
};

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const getPeriodRange = (period) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const pad = (number) => String(number).padStart(2, '0');
  const format = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  if (period === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (period === 'year') {
    start.setMonth(0, 1);
  } else {
    start.setDate(1);
  }

  return { from: format(start), to: format(now) };
};

const getTransactions = async (req, res) => {
  try {
    // date alone is not unique: createdAt then id give a stable tie-breaker so
    // same-day transactions keep their newest-added-first order after refresh.
    const { data, error } = await supabase
      .from('Transaction')
      .select('*')
      .eq('userId', req.user.id)
      .order('date', { ascending: false })
      .order('createdAt', { ascending: false })
      .order('id', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getTransactionSummary = async (req, res) => {
  const period = req.query.period || 'month';
  if (!['week', 'month', 'year'].includes(period)) {
    return res.status(400).json({ message: 'period must be one of: week, month, year' });
  }

  const category = req.query.category;
  if (category !== undefined && (typeof category !== 'string' || !category.trim())) {
    return res.status(400).json({ message: 'category must be a non-empty string' });
  }

  const { from, to } = getPeriodRange(period);

  try {
    const { data, error } = await supabase
      .from('Transaction')
      .select('*')
      .eq('userId', req.user.id);
    if (error) throw error;

    const rows = (data || []).filter((row) => {
      const date = String(row.date || '').slice(0, 10);
      return date >= from && date <= to && (
        !category || String(row.category || '').toLowerCase() === category.toLowerCase()
      );
    });

    let income = 0;
    let expense = 0;
    const byCategory = {};
    rows.forEach((row) => {
      const amount = Number(row.amount) || 0;
      if (row.type === 'income') {
        income += amount;
      } else if (row.type === 'expense') {
        expense += amount;
        const key = row.category || 'Other';
        byCategory[key] = (byCategory[key] || 0) + amount;
      }
    });

    res.json({
      period,
      from,
      to,
      category: category || null,
      income: round(income),
      expense: round(expense),
      net: round(income - expense),
      byCategory: Object.fromEntries(Object.entries(byCategory).map(([key, value]) => [key, round(value)])),
      transactionCount: rows.length,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const createTransaction = async (req, res) => {
  const { errors, fields } = validateTransactionFields(req.body);
  if (errors.length) return res.status(400).json({ message: errors.join('; ') });
  if (!fields.date) fields.date = new Date().toISOString();

  try {
    // One canonical resolver for every write path (UI, chat, imports).
    const category = await ensureCategoryWithStatus(req.user.id, fields.category, fields.type);
    fields.category = category.name;

    const { data, error } = await supabase
      .from('Transaction')
      .insert([{
        id: require('crypto').randomUUID(),
        userId: req.user.id,
        ...fields,
      }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ ...data, categoryCreated: category.created });
  } catch (err) {
    if (isValidationError(err.message)) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { errors, fields } = validateTransactionFields(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ message: errors.join('; ') });
  if (!Object.keys(fields).length) return res.status(400).json({ message: 'No transaction fields to update' });

  try {
    let categoryCreated = false;
    const changesCategory = Object.prototype.hasOwnProperty.call(fields, 'category');
    const changesType = Object.prototype.hasOwnProperty.call(fields, 'type');

    if (changesCategory || changesType) {
      // Resolve against the owner's current row so a type-only edit still
      // produces a valid category for the new type.
      const { data: existing, error: lookupError } = await supabase
        .from('Transaction')
        .select('category, type')
        .eq('id', id)
        .eq('userId', req.user.id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (!existing) return res.status(404).json({ message: 'Transaction not found' });

      const category = await ensureCategoryWithStatus(
        req.user.id,
        fields.category ?? existing.category,
        fields.type ?? existing.type
      );
      fields.category = category.name;
      categoryCreated = category.created;
    }

    const { data, error } = await supabase
      .from('Transaction')
      .update(fields)
      .eq('id', id)
      .eq('userId', req.user.id)
      .select();
    if (error) throw error;
    if (!data || !data.length) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ ...data[0], categoryCreated });
  } catch (err) {
    if (isValidationError(err.message)) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('Transaction')
      .delete()
      .eq('id', id)
      .eq('userId', req.user.id)
      .select('id');
    if (error) throw error;
    if (!data || !data.length) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getTransactions,
  getTransactionSummary,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
