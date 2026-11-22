import { useState, useEffect, useCallback, useMemo } from 'react'
import api from '../services/api'
import AppNav from '../components/AppNav'
import ConfirmDialog from '../components/ConfirmDialog'
import CategoryDropdown from '../components/CategoryDropdown'
import DataActions from '../components/DataActions'
import ImportModal from '../components/ImportModal'
import PageContainer from '../components/PageContainer'
import PageWrapper from '../components/PageWrapper'
import TransactionsRail from '../components/TransactionsRail'
import { Stagger } from '../components/Motion'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import DatePicker from '../components/ui/DatePicker'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'
import SegmentedControl from '../components/ui/SegmentedControl'
import Select from '../components/ui/Select'
import { RowsSkeleton, StatCardSkeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import useWakeHint, { WAKE_MESSAGE } from '../components/ui/useWakeHint'
import { useTheme } from '../context/ThemeContext'
import { useRegisterPageContext } from '../context/PageContext'
import { useDataRefresh } from '../utils/dataEvents'
import { DEFAULT_CATEGORIES, sameCategory, getCategoryBadgeClasses, getCategoryColor } from '../utils/categories'
import { DATE_RANGE_OPTIONS, getDateBounds, getAppliedFilterMeta } from '../utils/exportTransactions'

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

const PAGE_SIZE = 100
const LABEL = 'mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400'
// Static class strings so Tailwind keeps them in production builds.
const ROW_COLS = 'md:grid-cols-[140px_minmax(0,1fr)_120px_96px_72px] 2xl:grid-cols-[140px_minmax(0,1fr)_120px_96px_120px_76px]'
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'highest', label: 'Highest amount' },
  { value: 'lowest', label: 'Lowest amount' },
]

export default function Transaction() {
  const { dark } = useTheme()
  const toast = useToast()
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
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE)

  const wakeHint = useWakeHint(loading)

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

  useRegisterPageContext({
    page: 'transactions',
    visibleCount: filteredTransactions.length,
    totalCount: transactions.length,
    activeFilters: { type: typeFilter, category: categoryFilter || 'all', dateRange: datePreset, search: search || '' },
    sort: sortBy,
  })
  // Refresh when the assistant adds a transaction.
  useDataRefresh(() => fetchTransactions())

  const filtersActive = Boolean(
    searchInput || typeFilter !== DEFAULT_FILTERS.type || categoryFilter ||
    datePreset !== DEFAULT_FILTERS.datePreset || customFrom || customTo ||
    sortBy !== DEFAULT_FILTERS.sort
  )

  const activeFilterCount = [
    Boolean(searchInput), typeFilter !== 'all', Boolean(categoryFilter),
    datePreset !== 'all',
  ].filter(Boolean).length

  const applyQuickFilter = (patch) => {
    if (patch.datePreset) { setDatePreset(patch.datePreset); setCustomFrom(''); setCustomTo('') }
    if (patch.type) setTypeFilter(patch.type)
    if (patch.category) setCategoryFilter(patch.category)
    if (patch.sort) setSortBy(patch.sort)
    setVisibleLimit(PAGE_SIZE)
  }

  const clearFilters = () => {
    setVisibleLimit(PAGE_SIZE)
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
      toast.success(editItem ? 'Transaction updated.' : 'Transaction added.')
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
      toast.success('Transaction deleted.')
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

  const CATEGORY_FILTER_OPTIONS = [
    { value: '', label: 'All categories' },
    ...usedCategories.map((name) => ({ value: name, label: name, color: getCategoryColor(name) })),
  ]

  const modalCategoryExtra = showExtraCategory ? form.category : null

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gray-50 transition-colors duration-300 dark:bg-gray-950">
        <AppNav />

        <PageContainer className="py-8">
          <Stagger delay={50}>
            <PageHeader
              eyebrow="Transaction center"
              title="Transactions"
              description="Add, edit, import and review every income or expense entry."
              actions={(
                <>
                  <DataActions
                    onImport={() => setShowImport(true)}
                    allTransactions={transactions}
                    filteredTransactions={filteredTransactions}
                    filterMeta={exportMeta}
                  />
                  <Button variant="primary" onClick={openAdd} leftIcon={<Icon name="plus" size={16} />}>Add transaction</Button>
                </>
              )}
            />
          </Stagger>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <div className="min-w-0 space-y-6 xl:col-span-8 2xl:col-span-9">
              {/* Summary */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {loading ? (
                  [0, 1, 2].map((i) => <StatCardSkeleton key={i} />)
                ) : [
                  { label: 'Total income', value: income, tone: 'text-emerald-600 dark:text-emerald-400', icon: 'trendUp' },
                  { label: 'Total expenses', value: expenses, tone: 'text-red-600 dark:text-red-400', icon: 'trendDown' },
                  { label: 'Net balance', value: balance, tone: balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400', icon: 'wallet' },
                ].map((stat, i) => (
                  <Stagger key={stat.label} delay={100 + i * 75}>
                    <div className="vl-card vl-card-hover h-full p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{stat.label}</p>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800">
                          <Icon name={stat.icon} size={16} />
                        </span>
                      </div>
                      <p className={`tabular text-2xl font-bold ${stat.tone}`}>Rs. {stat.value.toLocaleString('en-IN')}</p>
                      <p className="mt-1 text-xs text-gray-400">Across all {transactions.length} entries</p>
                    </div>
                  </Stagger>
                ))}
              </div>

              {/* Sticky filter toolbar. `sticky` sits on the outer div so it can travel the full column. */}
              <div className="sticky top-14 z-30 md:top-4 -mx-1 px-1 pt-1">
                <Stagger delay={300}>
                  <div className="vl-card p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Input
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search description or category"
                        aria-label="Search transactions"
                        leadingIcon={<Icon name="search" size={16} />}
                        wrapperClassName="min-w-[180px] flex-1"
                      />
                      <div className="sm:hidden">
                        <Button
                          variant="secondary"
                          aria-expanded={showFilters}
                          onClick={() => setShowFilters((v) => !v)}
                          leftIcon={<Icon name="filter" size={15} />}
                        >
                          Filters
                          {activeFilterCount > 0 && (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">{activeFilterCount}</span>
                          )}
                        </Button>
                      </div>
                      <span className="tabular ml-auto text-xs text-gray-400" aria-live="polite">
                        {filteredTransactions.length} of {transactions.length}
                      </span>
                      {filtersActive && (
                        <button type="button" onClick={clearFilters} className="vl-focus rounded text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                          Clear filters
                        </button>
                      )}
                    </div>

                    <div className={`${showFilters ? 'grid' : 'hidden'} mt-3 grid-cols-1 gap-3 sm:grid sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end`}>
                      <div>
                        <span className={LABEL}>Type</span>
                        <SegmentedControl
                          aria-label="Transaction type"
                          value={typeFilter}
                          onChange={setTypeFilter}
                          options={[{ value: 'all', label: 'All' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }]}
                          className="w-full lg:w-[240px]"
                        />
                      </div>
                      <div className="lg:w-[190px]">
                        <span className={LABEL}>Category</span>
                        <Select aria-label="Filter by category" value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_FILTER_OPTIONS} searchPlaceholder="Search categories" />
                      </div>
                      <div className="lg:w-[170px]">
                        <span className={LABEL}>Date range</span>
                        <Select
                          aria-label="Date range"
                          value={datePreset}
                          options={DATE_RANGE_OPTIONS}
                          leadingIcon={<Icon name="calendar" size={15} />}
                          onChange={(v) => {
                            setDatePreset(v)
                            if (v !== 'custom') { setCustomFrom(''); setCustomTo('') }
                          }}
                        />
                      </div>
                      {datePreset === 'custom' && (
                        <>
                          <div className="lg:w-[170px]">
                            <span className={LABEL}>Start</span>
                            <DatePicker aria-label="Custom start date" value={customFrom} onChange={setCustomFrom} max={customTo || undefined} placeholder="Start date" />
                          </div>
                          <div className="lg:w-[170px]">
                            <span className={LABEL}>End</span>
                            <DatePicker aria-label="Custom end date" value={customTo} onChange={setCustomTo} min={customFrom || undefined} placeholder="End date" />
                          </div>
                        </>
                      )}
                      <div className="lg:w-[170px]">
                        <span className={LABEL}>Sort</span>
                        <Select aria-label="Sort transactions" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
                      </div>
                      {dateBounds.invalid && <p className="w-full text-xs text-red-500">Start date must be on or before end date.</p>}
                    </div>
                  </div>
                </Stagger>
              </div>

              {/* List */}
              <Stagger delay={350}>
                <div className="vl-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-gray-800 md:px-6">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">All transactions</h2>
                      <p className="mt-0.5 text-xs text-gray-400">Search, filter and sort your records</p>
                    </div>
                    <span className="tabular text-xs text-gray-400">{filteredTransactions.length} of {transactions.length}</span>
                  </div>

                  {loading ? (
                    <>
                      <RowsSkeleton rows={7} />
                      {wakeHint && <p role="status" className="border-t border-gray-100 px-6 py-3 text-center text-xs text-gray-500 dark:border-gray-800">{WAKE_MESSAGE}</p>}
                    </>
                  ) : transactions.length === 0 ? (
                    <EmptyState
                      icon="wallet"
                      title="No transactions yet"
                      description="Add your first income or expense, or import a statement to get started."
                      action={(
                        <div className="flex gap-2">
                          <Button variant="primary" size="sm" onClick={openAdd} leftIcon={<Icon name="plus" size={14} />}>Add transaction</Button>
                          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)} leftIcon={<Icon name="upload" size={14} />}>Import</Button>
                        </div>
                      )}
                    />
                  ) : filteredTransactions.length === 0 ? (
                    <EmptyState
                      icon="search"
                      title="No transactions match your filters"
                      description="Try a different search or clear your filters."
                      action={<Button variant="primary" size="sm" onClick={clearFilters}>Clear filters</Button>}
                    />
                  ) : (
                    <>
                      <div className={`hidden border-b border-gray-100 bg-gray-50/60 px-6 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:bg-gray-900/50 md:grid md:items-center md:gap-4 ${ROW_COLS}`}>
                        <span>Category</span>
                        <span>Description</span>
                        <span>Date</span>
                        <span className="hidden 2xl:block">Type</span>
                        <span className="text-right">Amount</span>
                        <span className="sr-only">Actions</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {filteredTransactions.slice(0, visibleLimit).map((t, i) => (
                          <div
                            key={t.id}
                            className={`group grid gap-2 px-4 py-3 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50 md:items-center md:gap-4 md:px-6 ${ROW_COLS}`}
                            style={{ opacity: 0, animation: `fadeSlideIn 0.4s cubic-bezier(.4,0,.2,1) ${Math.min(i, 12) * 30}ms forwards` }}
                          >
                            <div className="flex min-w-0 items-center gap-3 md:contents">
                              <span className={`w-fit max-w-[130px] shrink-0 truncate rounded-full px-2.5 py-1 text-xs font-medium ${getCategoryBadgeClasses(t.category, dark)}`}>
                                {t.category}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{t.description || t.category}</p>
                                <p className="text-xs text-gray-400 md:hidden">{formatDate(t.date)}</p>
                              </div>
                            </div>
                            <span className="tabular hidden text-sm text-gray-500 md:block">{formatDate(t.date)}</span>
                            <span className="hidden 2xl:block">
                              <Badge tone={t.type === 'income' ? 'income' : 'expense'}>{t.type === 'income' ? 'Income' : 'Expense'}</Badge>
                            </span>
                            <div className="flex items-center justify-between md:contents">
                              <span className={`tabular text-sm font-semibold md:text-right ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {t.type === 'income' ? '+' : '-'}Rs. {Number(t.amount).toLocaleString('en-IN')}
                              </span>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEdit(t)}
                                  aria-label={`Edit ${t.description || t.category}`}
                                  className="vl-focus flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/15"
                                >
                                  <Icon name="edit" size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setTransactionDeleteError(''); setTransactionToDelete(t) }}
                                  aria-label={`Delete ${t.description || t.category}`}
                                  className="vl-focus flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                >
                                  <Icon name="trash" size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {filteredTransactions.length > visibleLimit && (
                        <div className="border-t border-gray-100 p-4 text-center dark:border-gray-800">
                          <Button variant="secondary" size="sm" onClick={() => setVisibleLimit((n) => n + PAGE_SIZE)}>
                            Show more ({filteredTransactions.length - visibleLimit} remaining)
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Stagger>
            </div>

            <aside className="min-w-0 xl:col-span-4 2xl:col-span-3" aria-label="Transaction summary">
              <div className="xl:sticky xl:top-6">
                <Stagger delay={400}>
                  <TransactionsRail transactions={transactions} onQuickFilter={applyQuickFilter} activeCategory={categoryFilter} />
                </Stagger>
              </div>
            </aside>
          </div>
        </PageContainer>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit transaction' : 'Add transaction'}
        description="Keep your records clear and current."
        footer={(
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" form="transaction-form" variant="primary" className="flex-1" loading={submitting}>
              {submitting ? 'Saving...' : editItem ? 'Save changes' : 'Add transaction'}
            </Button>
          </>
        )}
      >
        <form onSubmit={handleSubmit} id="transaction-form" className="flex flex-col gap-4">
          <div>
            <span className={LABEL}>Type</span>
            <SegmentedControl
              aria-label="Transaction type"
              value={form.type}
              options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
              onChange={(type) => {
                const first = categoryNames(categorySets, type)[0] || ''
                setForm((prev) => ({ ...prev, type, category: first }))
                setCustomCategory('')
                setFormError('')
                loadCategories(type)
              }}
            />
          </div>

          <div>
            <span className={LABEL}>Category</span>
            <CategoryDropdown
              dark={dark}
              defaults={activeCategorySet.defaults}
              custom={activeCategorySet.custom}
              value={form.category}
              extraName={modalCategoryExtra}
              disabled={submitting}
              otherValue={OTHER}
              onSelect={(name) => { setForm((prev) => ({ ...prev, category: name })); setFormError('') }}
              onDelete={(item) => { setCategoryDeleteError(''); setCategoryToDelete(item) }}
            />
            {form.category === OTHER && (
              <div className="mt-2">
                <Input
                  autoFocus
                  maxLength={30}
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Gym, Rent, Pet care"
                  aria-label="New category name"
                  hint="New categories are saved to your account with this transaction."
                />
              </div>
            )}
          </div>

          <Input
            label="Amount"
            type="number"
            required
            min="0"
            step="0.01"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0"
            className="tabular"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional"
          />
          <div>
            <span className={LABEL}>Date</span>
            <DatePicker aria-label="Transaction date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} />
          </div>

          {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
        </form>
      </Modal>

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
        existingTransactions={transactions}
        onImported={() => fetchTransactions()}
        onUndone={() => fetchTransactions()}
      />
    </PageWrapper>
  )
}
