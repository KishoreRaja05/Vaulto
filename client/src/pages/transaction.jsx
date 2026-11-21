import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import AppNav from '../components/AppNav'
import ConfirmDialog from '../components/ConfirmDialog'
import CategoryDropdown from '../components/CategoryDropdown'
import ExportMenu from '../components/ExportMenu'
import ImportModal from '../components/ImportModal'
import { useTheme } from '../context/ThemeContext'
import { DEFAULT_CATEGORIES, sameCategory, getCategoryBadgeClasses } from '../utils/categories'
import { DATE_RANGE_OPTIONS, getDateBounds, getAppliedFilterMeta } from '../utils/exportTransactions'

function PageWrapper({ children }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.45s cubic-bezier(.4,0,.2,1), transform 0.45s cubic-bezier(.4,0,.2,1)',
    }}>
      {children}
    </div>
  )
}

function Stagger({ children, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.5s cubic-bezier(.4,0,.2,1), transform 0.5s cubic-bezier(.4,0,.2,1)',
    }}>
      {children}
    </div>
  )
}

const OTHER = '__other__'

const categoryNames = (sets, type) => {
  const set = sets[type] || { defaults: [], custom: [] }
  return [...set.defaults, ...set.custom.map((item) => item.name)]
}

const emptyForm = () => ({
  amount: '',
  type: 'expense',
  category: DEFAULT_CATEGORIES.expense[0],
  description: '',
  date: new Date().toISOString().split('T')[0],
})

// A date-only value represents the user's selected calendar day. Reading it as
// UTC midnight would show the previous day in negative offsets, so format the
// YYYY-MM-DD part as a local date. Full timestamps use the stored UTC day.
const formatDate = (date) => {
  const text = String(date || '')
  const day = text.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return ''
  const [year, month, monthDay] = day.split('-').map(Number)
  return new Date(year, month - 1, monthDay).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// Normalise a date-only value to noon UTC so it is the same calendar day in
// every timezone. Kept in sync with the server's stored representation.
const dateSortValue = (transaction) => {
  const raw = String(transaction?.date || '')
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00.000Z` : raw
}

// date -> createdAt -> id, matching the server's stable ordering.
const compareByDate = (a, b, newest = true) => {
  const aDate = dateSortValue(a)
  const bDate = dateSortValue(b)
  let result = aDate < bDate ? -1 : aDate > bDate ? 1 : 0
  if (result === 0) {
    const aCreated = String(a.createdAt || '')
    const bCreated = String(b.createdAt || '')
    result = aCreated < bCreated ? -1 : aCreated > bCreated ? 1 : 0
  }
  if (result === 0) result = String(a.id || '').localeCompare(String(b.id || ''))
  return newest ? -result : result
}

const sortTransactions = (list, mode) => {
  const items = [...list]
  if (mode === 'highest') {
    return items.sort((a, b) => (Number(b.amount) - Number(a.amount)) || compareByDate(a, b, true))
  }
  if (mode === 'lowest') {
    return items.sort((a, b) => (Number(a.amount) - Number(b.amount)) || compareByDate(a, b, true))
  }
  if (mode === 'oldest') return items.sort((a, b) => compareByDate(a, b, false))
  return items.sort((a, b) => compareByDate(a, b, true))
}

const normalizeTransactions = (list) => sortTransactions(
  Array.from(new Map((list || []).map((item) => [item.id, item])).values()),
  'newest'
)

// Date range bounds/options come from exportTransactions so table and export stay in sync.

const DEFAULT_FILTERS = {
  search: '', type: 'all', category: '', datePreset: 'all',
  customFrom: '', customTo: '', sort: 'newest',
}

export default function Transaction() {
  const { dark } = useTheme()
  const d = dark
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [categorySets, setCategorySets] = useState({
    expense: { defaults: DEFAULT_CATEGORIES.expense, custom: [] },
    income: { defaults: DEFAULT_CATEGORIES.income, custom: [] },
  })
  const [customCategory, setCustomCategory] = useState('')

  // Deletion dialogs (transaction + custom category) share ConfirmDialog.
  const [transactionToDelete, setTransactionToDelete] = useState(null)
  const [transactionDeleteLoading, setTransactionDeleteLoading] = useState(false)
  const [transactionDeleteError, setTransactionDeleteError] = useState('')
  const [categoryToDelete, setCategoryToDelete] = useState(null)
  const [categoryDeleteLoading, setCategoryDeleteLoading] = useState(false)
  const [categoryDeleteError, setCategoryDeleteError] = useState('')

  // Filters live in component state; summary cards always use all transactions.
  const [searchInput, setSearchInput] = useState(DEFAULT_FILTERS.search)
  const [search, setSearch] = useState(DEFAULT_FILTERS.search)
  const [typeFilter, setTypeFilter] = useState(DEFAULT_FILTERS.type)
  const [categoryFilter, setCategoryFilter] = useState(DEFAULT_FILTERS.category)
  const [datePreset, setDatePreset] = useState(DEFAULT_FILTERS.datePreset)
  const [customFrom, setCustomFrom] = useState(DEFAULT_FILTERS.customFrom)
  const [customTo, setCustomTo] = useState(DEFAULT_FILTERS.customTo)
  const [sortBy, setSortBy] = useState(DEFAULT_FILTERS.sort)
  const [showFilters, setShowFilters] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importSuccess, setImportSuccess] = useState('')

  const loadCategories = useCallback(async (type) => {
    try {
      const res = await api.get('/categories', { params: { type } })
      const data = res.data || {}
      setCategorySets((prev) => ({
        ...prev,
        [type]: {
          defaults: Array.isArray(data.defaults) ? data.defaults : DEFAULT_CATEGORIES[type],
          custom: Array.isArray(data.custom) ? data.custom : [],
        },
      }))
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions')
      setTransactions(normalizeTransactions(res.data))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    const loadTransactions = async () => {
      setLoading(true)
      try {
        const res = await api.get('/transactions')
        if (!isActive) return
        setTransactions(normalizeTransactions(res.data))
      } catch (err) {
        console.error(err)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadTransactions()
    return () => { isActive = false }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim().toLowerCase()), 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  const usedCategories = useMemo(
    () => Array.from(new Set(
      transactions.map((item) => String(item.category || '').trim()).filter(Boolean)
    )).sort((a, b) => a.localeCompare(b)),
    [transactions]
  )

  const dateBounds = useMemo(
    () => getDateBounds(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  )

  const filteredTransactions = useMemo(() => {
    if (dateBounds.invalid) return []
    const rows = transactions.filter((item) => {
      if (search) {
        const haystack = `${item.description || ''} ${item.category || ''}`.toLowerCase()
        if (!haystack.includes(search)) return false
      }
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (categoryFilter && String(item.category || '') !== categoryFilter) return false
      const day = String(item.date || '').slice(0, 10)
      if (dateBounds.from && day < dateBounds.from) return false
      if (dateBounds.to && day > dateBounds.to) return false
      return true
    })
    return sortTransactions(rows, sortBy)
  }, [transactions, search, typeFilter, categoryFilter, sortBy, dateBounds])

  const exportMeta = useMemo(() => getAppliedFilterMeta({
    searchInput,
    typeFilter,
    categoryFilter,
    datePreset,
    fromDate: customFrom,
    toDate: customTo,
    sortBy,
    dateBounds,
    totalCount: transactions.length,
    filteredCount: filteredTransactions.length,
  }), [searchInput, typeFilter, categoryFilter, datePreset, customFrom, customTo, sortBy, dateBounds, transactions.length, filteredTransactions.length])

  const filtersActive = Boolean(
    searchInput || typeFilter !== DEFAULT_FILTERS.type || categoryFilter ||
    datePreset !== DEFAULT_FILTERS.datePreset || customFrom || customTo ||
    sortBy !== DEFAULT_FILTERS.sort
  )

  const activeFilterCount = [
    Boolean(searchInput), typeFilter !== 'all', Boolean(categoryFilter),
    datePreset !== 'all',
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearchInput(DEFAULT_FILTERS.search)
    setSearch(DEFAULT_FILTERS.search)
    setTypeFilter(DEFAULT_FILTERS.type)
    setCategoryFilter(DEFAULT_FILTERS.category)
    setDatePreset(DEFAULT_FILTERS.datePreset)
    setCustomFrom(DEFAULT_FILTERS.customFrom)
    setCustomTo(DEFAULT_FILTERS.customTo)
    setSortBy(DEFAULT_FILTERS.sort)
  }

  const openAdd = () => {
    setEditItem(null)
    setForm(emptyForm())
    setCustomCategory('')
    setFormError('')
    setShowModal(true)
    loadCategories('expense')
  }

  const openEdit = (t) => {
    setEditItem(t)
    setForm({
      amount: t.amount,
      type: t.type,
      category: t.category || '',
      description: t.description || '',
      date: t.date.split('T')[0],
    })
    setCustomCategory('')
    setFormError('')
    setShowModal(true)
    loadCategories(t.type)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    let category = form.category
    if (category === OTHER) {
      const typed = customCategory.trim()
      if (!typed) {
        setFormError('Enter a category name, or choose one from the list.')
        return
      }
      const existing = categoryNames(categorySets, form.type).find((name) => sameCategory(name, typed))
      category = existing || typed
    }
    if (!category) {
      setFormError('Choose a category.')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const payload = { ...form, category }
      const res = editItem
        ? await api.put(`/transactions/${editItem.id}`, payload)
        : await api.post('/transactions', payload)

      // The backend normalises and stores new categories; mirror it locally so
      // the next modal open already shows it without an extra round trip.
      const savedCategory = res?.data?.category || category
      if (!categoryNames(categorySets, form.type).some((name) => sameCategory(name, savedCategory))) {
        setCategorySets((prev) => {
          const set = prev[form.type] || { defaults: [], custom: [] }
          return {
            ...prev,
            [form.type]: {
              ...set,
              custom: [...set.custom, { name: savedCategory, type: form.type, id: res?.data?.id }],
            },
          }
        })
      }

      setShowModal(false)
      fetchTransactions()
    } catch (err) {
      console.error(err)
      setFormError(err?.response?.data?.message || 'Failed to save transaction.')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmTransactionDelete = async () => {
    if (!transactionToDelete || transactionDeleteLoading) return
    setTransactionDeleteLoading(true)
    setTransactionDeleteError('')
    try {
      await api.delete(`/transactions/${transactionToDelete.id}`)
      setTransactions((prev) => normalizeTransactions(prev.filter((t) => t.id !== transactionToDelete.id)))
      setTransactionToDelete(null)
    } catch (err) {
      console.error(err)
      setTransactionDeleteError(err?.response?.data?.message || 'Failed to delete transaction.')
    } finally {
      setTransactionDeleteLoading(false)
    }
  }

  const confirmCategoryDelete = async () => {
    if (!categoryToDelete || categoryDeleteLoading) return
    setCategoryDeleteLoading(true)
    setCategoryDeleteError('')
    const type = form.type
    try {
      await api.delete(`/categories/${categoryToDelete.id}`)
      setCategorySets((prev) => {
        const set = prev[type] || { defaults: [], custom: [] }
        return {
          ...prev,
          [type]: {
            ...set,
            custom: set.custom.filter((item) => item.id !== categoryToDelete.id),
          },
        }
      })
      if (sameCategory(form.category, categoryToDelete.name)) {
        setForm((prev) => ({ ...prev, category: DEFAULT_CATEGORIES[type][0] || '' }))
      }
      setCategoryToDelete(null)
    } catch (err) {
      console.error(err)
      setCategoryDeleteError(err?.response?.data?.message || 'Failed to delete category.')
    } finally {
      setCategoryDeleteLoading(false)
    }
  }

  const activeCategorySet = categorySets[form.type] || { defaults: [], custom: [] }
  const showExtraCategory = form.category
    && form.category !== OTHER
    && !categoryNames(categorySets, form.type).some((name) => sameCategory(name, form.category))

  const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0)
  const expenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0)
  const balance = income - expenses

  const inputClass = `w-full min-w-0 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 ${d ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'}`
  const chipClass = `rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${d ? 'border-gray-700 bg-gray-800 text-gray-300 hover:text-white' : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900'}`

  return (
    <PageWrapper>
      <div className={`min-h-screen transition-colors duration-300 ${d ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <AppNav />

        <div className="max-w-6xl mx-auto px-6 py-8">
          <Stagger delay={50}>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Transaction center</p>
                <h2 className={`text-2xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>Transactions</h2>
                <p className="text-gray-500 text-sm mt-1">Add, edit, and review every income or expense entry.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setImportSuccess(''); setShowImport(true) }}
                  className={`inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-all duration-200 ${
                    d
                      ? 'bg-gray-900 border-gray-700 text-gray-200 hover:border-indigo-500 hover:text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-300 hover:text-indigo-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V9m0 0l4 4m-4-4l-4 4M4 7V5a2 2 0 012-2h12a2 2 0 012 2v2" />
                  </svg>
                  Import
                </button>
                <ExportMenu dark={d} transactions={filteredTransactions} meta={exportMeta} />
                <button
                  onClick={openAdd}
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add transaction
                </button>
              </div>
            </div>
          </Stagger>
          {importSuccess && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${d ? 'border-green-800/60 bg-green-900/20 text-green-300' : 'border-green-200 bg-green-50 text-green-700'}`}>
              {importSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Total Income', value: `Rs. ${income.toLocaleString()}`, tone: 'text-green-600', iconBg: 'bg-green-50', iconColor: 'text-green-600' },
              { label: 'Total Expenses', value: `Rs. ${expenses.toLocaleString()}`, tone: 'text-red-500', iconBg: 'bg-red-50', iconColor: 'text-red-500' },
              { label: 'Net Balance', value: `Rs. ${balance.toLocaleString()}`, tone: balance >= 0 ? 'text-indigo-600' : 'text-red-500', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
            ].map((stat, i) => (
              <Stagger key={stat.label} delay={100 + i * 75}>
                <div
                  className={`rounded-2xl p-5 border h-full transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_40px_rgba(99,102,241,0.12)] ${d ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                    <div className={`w-8 h-8 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                      <svg className={`w-4 h-4 ${stat.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${stat.tone}`}>{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">Across all {transactions.length} entries</p>
                </div>
              </Stagger>
            ))}
          </div>

          {/* Filter bar */}
          <Stagger delay={300}>
            <div className={`rounded-2xl border p-4 mb-4 ${d ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[180px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                  </svg>
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search description or category"
                    aria-label="Search transactions"
                    className={`${inputClass} pl-9`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilters((value) => !value)}
                  className={`sm:hidden inline-flex items-center gap-1.5 ${chipClass}`}
                  aria-expanded={showFilters}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10m-7 6h4" />
                  </svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px]">{activeFilterCount}</span>
                  )}
                </button>

                <span className="text-xs text-gray-400 ml-auto">
                  {filteredTransactions.length} of {transactions.length} transactions
                </span>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-wrap items-end gap-3 mt-3`}>
                <div className="w-full sm:w-auto">
                  <label className={`block text-[10px] font-medium uppercase tracking-wide mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Type</label>
                  <div className={`inline-flex rounded-lg border p-0.5 ${d ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'}`}>
                    {[['all', 'All'], ['income', 'Income'], ['expense', 'Expense']].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTypeFilter(value)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === value
                          ? (d ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 shadow-sm')
                          : (d ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900')}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full sm:w-[150px]">
                  <label className={`block text-[10px] font-medium uppercase tracking-wide mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Category</label>
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={inputClass} aria-label="Filter by category">
                    <option value="">All categories</option>
                    {usedCategories.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>

                <div className="w-full sm:w-[170px]">
                  <label className={`block text-[10px] font-medium uppercase tracking-wide mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Date range</label>
                  <select
                    value={datePreset}
                    onChange={(e) => {
                      setDatePreset(e.target.value)
                      if (e.target.value !== 'custom') {
                        setCustomFrom('')
                        setCustomTo('')
                      }
                    }}
                    className={inputClass}
                    aria-label="Date range preset"
                  >
                    {DATE_RANGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {datePreset === 'custom' && (
                  <>
                    <div className="w-full sm:w-[150px]">
                      <label className={`block text-[10px] font-medium uppercase tracking-wide mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Start</label>
                      <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className={inputClass} aria-label="Custom start date" />
                    </div>
                    <div className="w-full sm:w-[150px]">
                      <label className={`block text-[10px] font-medium uppercase tracking-wide mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>End</label>
                      <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className={inputClass} aria-label="Custom end date" />
                    </div>
                    {dateBounds.invalid && (
                      <p className="w-full text-xs text-red-500">Start date must be on or before end date.</p>
                    )}
                  </>
                )}

                <div className="w-full sm:w-[150px]">
                  <label className={`block text-[10px] font-medium uppercase tracking-wide mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Sort</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={inputClass} aria-label="Sort transactions">
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="highest">Highest amount</option>
                    <option value="lowest">Lowest amount</option>
                  </select>
                </div>
              </div>
            </div>
          </Stagger>

          <Stagger delay={350}>
            <div
              className={`rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_40px_rgba(99,102,241,0.12)] ${d ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
            >
              <div className={`flex items-center justify-between px-6 py-4 border-b ${d ? 'border-gray-800' : 'border-gray-100'}`}>
                <div>
                  <h3 className={`font-semibold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>All Transactions</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Search, filter and sort your records</p>
                </div>
                <span className="text-xs text-gray-400">{filteredTransactions.length} of {transactions.length}</span>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <svg className="w-5 h-5 animate-spin text-indigo-400 mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-14 text-center px-6">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className={`text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>No transactions yet</p>
                  <p className="text-xs text-gray-400 mb-4">Add your first income or expense to start tracking.</p>
                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-medium px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add transaction
                  </button>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-14 text-center px-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${d ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <circle cx="11" cy="11" r="7" />
                      <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                    </svg>
                  </div>
                  <p className={`text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>No transactions match your filters</p>
                  <p className="text-xs text-gray-400 mb-4">Try a different search or clear your filters.</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className={`divide-y ${d ? 'divide-gray-800' : 'divide-gray-50'}`}>
                  {filteredTransactions.map((t, i) => (
                    <div
                      key={t.id}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 transition-all duration-150 group ${d ? 'hover:bg-gray-800/70' : 'hover:bg-gray-50'}`}
                      style={{ opacity: 0, animation: `fadeSlideIn 0.4s cubic-bezier(.4,0,.2,1) ${i * 45}ms forwards` }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${getCategoryBadgeClasses(t.category, d)}`}>
                          {t.category}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${d ? 'text-gray-200' : 'text-gray-900'}`}>{t.description || t.category}</p>
                          <p className="text-xs text-gray-400">{formatDate(t.date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                          {t.type === 'income' ? '+' : '-'}Rs. {Number(t.amount).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(t)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-150"
                            aria-label="Edit transaction"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { setTransactionDeleteError(''); setTransactionToDelete(t) }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
                            aria-label="Delete transaction"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Stagger>
        </div>
      </div>

      {showModal && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div style={{ width: '100%', maxWidth: '440px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', border: `1px solid ${d ? '#1f2937' : '#e5e7eb'}`, background: d ? '#111827' : '#ffffff' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${d ? '#1f2937' : '#f3f4f6'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontWeight: 600, fontSize: '14px', color: d ? '#f9fafb' : '#111827', margin: 0 }}>{editItem ? 'Edit Transaction' : 'Add Transaction'}</h3>
                <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Keep your records clear and current.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 24px' }}>
              <form onSubmit={handleSubmit} id="transaction-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: d ? '#d1d5db' : '#374151', marginBottom: '6px' }}>Type</label>
                  <select
                    value={form.type}
                    onChange={e => {
                      const type = e.target.value
                      const first = categoryNames(categorySets, type)[0] || ''
                      setForm(prev => ({ ...prev, type, category: first }))
                      setCustomCategory('')
                      setFormError('')
                      loadCategories(type)
                    }}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none' }}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: d ? '#d1d5db' : '#374151', marginBottom: '6px' }}>Category</label>
                  <CategoryDropdown
                    dark={d}
                    defaults={activeCategorySet.defaults}
                    custom={activeCategorySet.custom}
                    value={form.category}
                    extraName={showExtraCategory ? form.category : null}
                    disabled={submitting}
                    otherValue={OTHER}
                    onSelect={(name) => {
                      setForm((prev) => ({ ...prev, category: name }))
                      setFormError('')
                    }}
                    onDelete={(item) => { setCategoryDeleteError(''); setCategoryToDelete(item) }}
                  />
                  {form.category === OTHER && (
                    <div style={{ marginTop: '8px' }}>
                      <input
                        autoFocus
                        type="text"
                        maxLength={30}
                        value={customCategory}
                        onChange={e => setCustomCategory(e.target.value)}
                        placeholder="e.g. Gym, Rent, Pet care"
                        style={{ width: '100%', padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '5px' }}>
                        New categories are saved to your account with this transaction.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: d ? '#d1d5db' : '#374151', marginBottom: '6px' }}>Amount</label>
                  <input
                    type="number"
                    required
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: d ? '#d1d5db' : '#374151', marginBottom: '6px' }}>Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional"
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: d ? '#d1d5db' : '#374151', marginBottom: '6px' }}>Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', background: d ? '#1f2937' : '#fff', color: d ? '#f9fafb' : '#111827', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {formError && (
                  <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>{formError}</p>
                )}
              </form>
            </div>

            <div style={{ padding: '16px 24px 20px', borderTop: `1px solid ${d ? '#1f2937' : '#f3f4f6'}`, display: 'flex', gap: '12px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: '10px', border: `1px solid ${d ? '#374151' : '#d1d5db'}`, borderRadius: '8px', fontSize: '14px', color: d ? '#d1d5db' : '#374151', background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="transaction-form"
                disabled={submitting}
                style={{ flex: 1, padding: '10px', background: submitting ? '#818cf8' : '#4f46e5', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 500, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Saving...' : editItem ? 'Save Changes' : 'Add Transaction'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={Boolean(transactionToDelete)}
        title="Delete transaction?"
        message={`Delete the ${transactionToDelete?.type === 'income' ? 'income' : 'expense'} of Rs. ${Number(transactionToDelete?.amount || 0).toLocaleString()}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        loading={transactionDeleteLoading}
        error={transactionDeleteError}
        onConfirm={confirmTransactionDelete}
        onCancel={() => setTransactionToDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        title="Delete category?"
        message={`Delete "${categoryToDelete?.name || ''}"? Existing transactions keep this category name, but it will no longer appear in your dropdown.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        loading={categoryDeleteLoading}
        error={categoryDeleteError}
        onConfirm={confirmCategoryDelete}
        onCancel={() => setCategoryToDelete(null)}
      />

      <ImportModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onImported={async (inserted) => {
          await fetchTransactions()
          setImportSuccess(`${inserted} transaction${inserted === 1 ? '' : 's'} imported.`)
        }}
      />

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </PageWrapper>
  )
}
