// Category defaults are hardcoded on both client and server; only custom
// categories are stored. These helpers keep rendering generic for any string.

export const DEFAULT_CATEGORIES = {
  expense: ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment'],
  income: ['Salary', 'Freelance'],
}

// Matches the palette already used by Analytics charts.
export const CATEGORY_PALETTE = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b']

const LIGHT_TONES = [
  'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'bg-sky-50 text-sky-700 border border-sky-200',
  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'bg-amber-50 text-amber-700 border border-amber-200',
  'bg-violet-50 text-violet-700 border border-violet-200',
  'bg-cyan-50 text-cyan-700 border border-cyan-200',
  'bg-rose-50 text-rose-700 border border-rose-200',
  'bg-slate-100 text-slate-600 border border-slate-200',
]

const DARK_TONES = [
  'bg-indigo-900/40 text-indigo-300 border border-indigo-800',
  'bg-sky-900/40 text-sky-300 border border-sky-800',
  'bg-emerald-900/40 text-emerald-300 border border-emerald-800',
  'bg-amber-900/40 text-amber-300 border border-amber-800',
  'bg-violet-900/40 text-violet-300 border border-violet-800',
  'bg-cyan-900/40 text-cyan-300 border border-cyan-800',
  'bg-rose-900/40 text-rose-300 border border-rose-800',
  'bg-slate-800 text-slate-300 border border-slate-700',
]

const KNOWN_TONES = {
  food: ['bg-orange-50 text-orange-700 border border-orange-200', 'bg-orange-900/40 text-orange-300 border border-orange-800'],
  transport: ['bg-blue-50 text-blue-700 border border-blue-200', 'bg-blue-900/40 text-blue-300 border border-blue-800'],
  shopping: ['bg-pink-50 text-pink-700 border border-pink-200', 'bg-pink-900/40 text-pink-300 border border-pink-800'],
  bills: ['bg-red-50 text-red-700 border border-red-200', 'bg-red-900/40 text-red-300 border border-red-800'],
  entertainment: ['bg-purple-50 text-purple-700 border border-purple-200', 'bg-purple-900/40 text-purple-300 border border-purple-800'],
  healthcare: ['bg-rose-50 text-rose-700 border border-rose-200', 'bg-rose-900/40 text-rose-300 border border-rose-800'],
  education: ['bg-sky-50 text-sky-700 border border-sky-200', 'bg-sky-900/40 text-sky-300 border border-sky-800'],
  rent: ['bg-amber-50 text-amber-700 border border-amber-200', 'bg-amber-900/40 text-amber-300 border border-amber-800'],
  salary: ['bg-green-50 text-green-700 border border-green-200', 'bg-green-900/40 text-green-300 border border-green-800'],
  freelance: ['bg-teal-50 text-teal-700 border border-teal-200', 'bg-teal-900/40 text-teal-300 border border-teal-800'],
}

// Small deterministic string hash (FNV-1a style) so a category keeps the same
// color wherever it is rendered, regardless of sorting or transaction order.
export const categoryHash = (value) => {
  const text = String(value || 'Other')
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

export const getCategoryColor = (name) =>
  CATEGORY_PALETTE[categoryHash(name) % CATEGORY_PALETTE.length]

export const getCategoryBadgeClasses = (name, dark = false) => {
  const known = KNOWN_TONES[String(name || '').toLowerCase()]
  if (known) return known[dark ? 1 : 0]
  const tones = dark ? DARK_TONES : LIGHT_TONES
  return tones[categoryHash(name) % tones.length]
}

export const sameCategory = (a, b) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()
