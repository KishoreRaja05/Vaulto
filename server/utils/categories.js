const supabase = require('./supabase');
const { randomUUID } = require('crypto');

// Hardcoded defaults are never stored in the Category table. They are only
// returned alongside the per-user custom categories.
const DEFAULT_CATEGORIES = Object.freeze({
  expense: Object.freeze(['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment']),
  income: Object.freeze(['Salary', 'Freelance']),
});

const MAX_CATEGORY_LENGTH = 30;
const CATEGORY_TYPES = ['income', 'expense'];

const isValidType = (type) => CATEGORY_TYPES.includes(type);

// Trim, collapse whitespace, strip symbols other than letters/numbers/space/&/-,
// cap at 30 characters, then Title Case. Returns '' when nothing is left.
const cleanCategoryName = (raw) => {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .replace(/[^\p{L}\p{N}&\-\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CATEGORY_LENGTH)
    .trim();
  if (!cleaned) return '';
  return cleaned
    .toLowerCase()
    .replace(/(^|[\s&-])(\p{L})/gu, (_, separator, letter) => separator + letter.toUpperCase());
};

const canonicalDefault = (name, type) =>
  (DEFAULT_CATEGORIES[type] || []).find((item) => item.toLowerCase() === name.toLowerCase()) || null;

const getCategoriesForUser = async (userId, type = null) => {
  if (!userId) return [];
  let query = supabase
    .from('Category')
    .select('id, userId, name, type, createdAt')
    .eq('userId', userId);
  if (type) query = query.eq('type', type);
  const { data, error } = await query.order('createdAt', { ascending: true });
  if (error) throw error;
  return data || [];
};

const findCustomByName = async (userId, name, type) => {
  const rows = await getCategoriesForUser(userId, type);
  return rows.find((row) => String(row.name).toLowerCase() === name.toLowerCase()) || null;
};

// Resolves a category to its canonical stored name. Everything that writes a
// transaction (UI, chat, imports) goes through here so the client can never
// invent a duplicate or inject an arbitrary string directly into the DB.
// Returns { name, created, id } — `created` is true only for a fresh insert.
const ensureCategoryWithStatus = async (userId, rawName, type) => {
  const name = cleanCategoryName(rawName);
  if (!name) throw new Error('category must contain at least one letter or number');
  if (!isValidType(type)) throw new Error('type must be income or expense');

  const defaultMatch = canonicalDefault(name, type);
  if (defaultMatch) return { name: defaultMatch, created: false, id: null };

  const existing = await findCustomByName(userId, name, type);
  if (existing) return { name: existing.name, created: false, id: existing.id };

  const id = randomUUID();
  const { data, error } = await supabase
    .from('Category')
    .insert([{ id, userId, name, type, createdAt: new Date().toISOString() }])
    .select()
    .single();

  if (!error) return { name: data.name, created: true, id: data.id };

  // The unique index on (userId, lower(name), type) means a concurrent request
  // may have inserted the same category first. Re-select rather than failing.
  const raced = await findCustomByName(userId, name, type);
  if (raced) return { name: raced.name, created: false, id: raced.id };
  throw error;
};

// Convenience form for callers that only need the canonical name.
const ensureCategory = async (userId, rawName, type) => {
  const { name } = await ensureCategoryWithStatus(userId, rawName, type);
  return name;
};

module.exports = {
  DEFAULT_CATEGORIES,
  MAX_CATEGORY_LENGTH,
  CATEGORY_TYPES,
  isValidType,
  cleanCategoryName,
  getCategoriesForUser,
  findCustomByName,
  ensureCategoryWithStatus,
  ensureCategory,
};
