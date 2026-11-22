import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'
import AppNav from '../components/AppNav'
import ChartTooltip from '../components/ChartTooltip'
import ConfirmDialog from '../components/ConfirmDialog'
import PageContainer from '../components/PageContainer'
import PageWrapper from '../components/PageWrapper'
import { AnimatedNumber, Stagger } from '../components/Motion'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import PageHeader from '../components/ui/PageHeader'
import { ChartSkeleton, RowsSkeleton, StatCardSkeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import useWakeHint, { WAKE_MESSAGE } from '../components/ui/useWakeHint'
import { AXIS_PROPS, GRID_PROPS } from '../utils/chartStyles'
import { useRegisterPageContext } from '../context/PageContext'
import { useDataRefresh } from '../utils/dataEvents'
import { getCategoryBadgeClasses, getCategoryColor } from '../utils/categories'

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const todayLabel = () =>
  new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

const fmtDate = (value) => {
  const day = String(value || '').slice(0, 10)
  const [y, m, d] = day.split('-').map(Number)
  if (!y) return ''
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const money = (v) => `Rs. ${Math.round(Number(v) || 0).toLocaleString('en-IN')}`

// Static strings so Tailwind keeps them in production builds.
const ROW_COLS = 'md:grid-cols-[140px_minmax(0,1fr)_120px_120px_80px_44px]'

const INSIGHT_TONES = {
  green: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300', icon: 'trendUp' },
  amber: { cls: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300', icon: 'info' },
  red: { cls: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300', icon: 'alert' },
  indigo: { cls: 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300', icon: 'sparkle' },
  gray: { cls: 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300', icon: 'info' },
}

const fetchSortedTransactions = async () => {
  const res = await api.get('/transactions')
  return Array.from(new Map((res.data || []).map((item) => [item.id, item])).values())
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

export default function Dashboard() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const navigate = useNavigate()
  const toast = useToast()

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const wakeHint = useWakeHint(loading)

  useEffect(() => {
    let active = true
    fetchSortedTransactions()
      .then((list) => { if (active) setTransactions(list) })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // Assistant added something: refresh in place, no skeleton flash.
  useDataRefresh(() => { fetchSortedTransactions().then(setTransactions).catch(console.error) })

  const confirmDelete = async () => {
    if (!toDelete || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await api.delete(`/transactions/${toDelete.id}`)
      setTransactions((prev) => prev.filter((t) => t.id !== toDelete.id))
      setToDelete(null)
      toast.success('Transaction deleted.')
    } catch (err) {
      console.error(err)
      setDeleteError(err?.response?.data?.message || 'Failed to delete transaction.')
    } finally {
      setDeleting(false)
    }
  }

  const stats = useMemo(() => {
    const sum = (type) => transactions.filter((t) => t.type === type).reduce((a, b) => a + Number(b.amount), 0)
    const income = sum('income')
    const expenses = sum('expense')
    return {
      income,
      expenses,
      balance: income - expenses,
      savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
      incomeCount: transactions.filter((t) => t.type === 'income').length,
      expenseCount: transactions.filter((t) => t.type === 'expense').length,
    }
  }, [transactions])

  const chartData = useMemo(() => {
    const months = {}
    transactions.forEach((t) => {
      const key = String(t.date || '').slice(0, 7)
      if (!/^\d{4}-\d{2}$/.test(key)) return
      if (!months[key]) {
        const [y, m] = key.split('-').map(Number)
        months[key] = { key, month: new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short' }), income: 0, expenses: 0 }
      }
      months[key][t.type === 'income' ? 'income' : 'expenses'] += Number(t.amount)
    })
    return Object.values(months).sort((a, b) => a.key.localeCompare(b.key)).slice(-6)
  }, [transactions])

  const thisMonth = useMemo(() => {
    const now = new Date()
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const rows = transactions.filter((t) => String(t.date || '').slice(0, 7) === key)
    const cats = {}
    rows.filter((t) => t.type === 'expense').forEach((t) => { cats[t.category] = (cats[t.category] || 0) + Number(t.amount) })
    return {
      count: rows.length,
      income: rows.filter((t) => t.type === 'income').reduce((a, b) => a + Number(b.amount), 0),
      expenses: rows.filter((t) => t.type === 'expense').reduce((a, b) => a + Number(b.amount), 0),
      topCategories: Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5),
    }
  }, [transactions])

  const insights = useMemo(() => {
    const list = []
    const { income, expenses, savingsRate } = stats
    const expenseRate = income > 0 ? Math.round((expenses / income) * 100) : 0
    const cats = {}
    transactions.filter((t) => t.type === 'expense').forEach((t) => { cats[t.category] = (cats[t.category] || 0) + Number(t.amount) })
    const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]

    if (savingsRate >= 30) list.push({ tone: 'green', text: `Your savings rate is ${savingsRate}%. That is excellent. Keep it up.` })
    else if (savingsRate > 0) list.push({ tone: 'amber', text: `Your savings rate is ${savingsRate}%. Try to push it above 30%.` })
    if (expenseRate > 80 && income > 0) list.push({ tone: 'red', text: `You are spending ${expenseRate}% of your income. Consider cutting non-essentials.` })
    if (topCat) list.push({ tone: 'indigo', text: `${topCat[0]} is your highest expense category at ${money(topCat[1])}.` })
    if (thisMonth.count > 0) list.push({ tone: 'gray', text: `This month: ${money(thisMonth.income)} income, ${money(thisMonth.expenses)} expenses.` })
    if (!list.length) list.push({ tone: 'gray', text: 'Add more transactions to unlock detailed insights.' })
    return list
  }, [stats, transactions, thisMonth])

  const recent = transactions.slice(0, 8)

  useRegisterPageContext({
    page: 'dashboard',
    transactionCount: transactions.length,
    balance: Math.round(stats.balance),
    savingsRatePercent: stats.savingsRate,
    thisMonth: { income: Math.round(thisMonth.income), expenses: Math.round(thisMonth.expenses) },
    topCategories: thisMonth.topCategories.map(([name]) => name),
  })

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppNav />

        <PageContainer className="py-8">
          <Stagger delay={50}>
            <PageHeader
              eyebrow={todayLabel()}
              title={`${getGreeting()}, ${user?.name || ''}`}
              description="Here is your financial overview for today."
              actions={<Button variant="primary" onClick={() => navigate('/transactions')} leftIcon={<Icon name="plus" size={16} />}>Add transaction</Button>}
            />
          </Stagger>

          {/* Stat cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading ? [0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />) : (
              <>
                <Stagger delay={100}>
                  <div className="vl-card vl-card-hover relative h-full cursor-default overflow-hidden border-indigo-600 bg-indigo-600 p-5 text-white">
                    <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                    <div className="relative mb-3 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">Total balance</p>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20"><Icon name="wallet" size={16} /></span>
                    </div>
                    <p className="relative text-2xl font-bold">Rs. <AnimatedNumber value={stats.balance} /></p>
                    <p className="relative mt-1 text-xs text-indigo-200">{transactions.length} total transactions</p>
                  </div>
                </Stagger>

                <Stagger delay={175}>
                  <div className="vl-card vl-card-hover h-full p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Income</p>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"><Icon name="trendUp" size={16} /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">Rs. <AnimatedNumber value={stats.income} /></p>
                    <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">{stats.incomeCount} income entries</p>
                  </div>
                </Stagger>

                <Stagger delay={250}>
                  <div className="vl-card vl-card-hover h-full p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Expenses</p>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"><Icon name="trendDown" size={16} /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">Rs. <AnimatedNumber value={stats.expenses} /></p>
                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{stats.expenseCount} expense entries</p>
                  </div>
                </Stagger>

                <Stagger delay={325}>
                  <div className="vl-card vl-card-hover h-full p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Savings rate</p>
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon name="trendUp" size={16} /></span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white"><AnimatedNumber value={stats.savingsRate} suffix="%" /></p>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full vl-muted-bg">
                      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.max(0, Math.min(stats.savingsRate, 100))}%`, transition: 'width 1.2s cubic-bezier(.4,0,.2,1)' }} />
                    </div>
                  </div>
                </Stagger>
              </>
            )}
          </div>

          {/* Chart + insights grid */}
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2 min-w-0">
              {loading ? <div className="w-full"><ChartSkeleton height={320} /></div> : (
                <Stagger delay={400} className="h-full min-w-0">
                  <div className="vl-card vl-card-hover w-full h-full min-h-0 p-6 flex flex-col">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly overview</h2>
                        <p className="mt-0.5 text-xs text-gray-400">Income vs expenses, last {chartData.length || 6} months</p>
                      </div>
                      <Link to="/analytics" className="vl-focus flex items-center gap-1 rounded text-xs font-medium text-indigo-600 transition-all duration-150 hover:gap-2 dark:text-indigo-400">
                        Full analytics <Icon name="chevronRight" size={13} />
                      </Link>
                    </div>
                    {chartData.length === 0 ? (
                      <div className="flex-1 min-h-[320px] flex items-center justify-center">
                        <EmptyState icon="inbox" title="No data to chart yet" description="Add a few transactions and your monthly trend appears here." />
                      </div>
                    ) : (
                      <div role="img" aria-label="Bar chart of monthly income and expenses" className="flex-1 w-full min-w-0 min-h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barSize={16} barGap={4}>
                            <CartesianGrid {...GRID_PROPS} />
                            <XAxis dataKey="month" {...AXIS_PROPS} />
                            <YAxis {...AXIS_PROPS} tickFormatter={(v) => `Rs.${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: dark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)' }} />
                            <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="mt-3 flex gap-4">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Income</span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-500"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" />Expenses</span>
                    </div>
                  </div>
                </Stagger>
              )}
            </div>

            <div className="lg:col-span-1 flex flex-col gap-6 min-w-0">
              <Stagger delay={475} className="min-w-0">
                <div className="vl-card vl-card-hover p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon name="sparkle" size={15} /></span>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Insights</h2>
                      <p className="text-xs text-gray-400">Based on your transactions</p>
                    </div>
                  </div>
                  {loading ? (
                    <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="vl-skeleton h-12" />)}</div>
                  ) : transactions.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">Add transactions to get insights</p>
                  ) : (
                    <ul className="space-y-3">
                      {insights.map((ins) => (
                        <li key={ins.text} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${INSIGHT_TONES[ins.tone].cls}`}>
                          <Icon name={INSIGHT_TONES[ins.tone].icon} size={15} className="mt-0.5 shrink-0" />
                          <p className="text-xs leading-relaxed">{ins.text}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Stagger>

              <Stagger delay={550} className="min-w-0 flex-1">
                <div className="vl-card vl-card-hover p-6 h-full">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Top categories</h2>
                  <p className="mb-4 mt-0.5 text-xs text-gray-400">Where you spent most this month</p>
                  {loading ? (
                    <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="vl-skeleton h-8" />)}</div>
                  ) : thisMonth.topCategories.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">No expenses recorded this month.</p>
                  ) : (
                    <ul className="space-y-3.5">
                      {thisMonth.topCategories.map(([name, value]) => (
                        <li key={name}>
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                              <span className="h-2 w-2 rounded-full" style={{ background: getCategoryColor(name) }} />{name}
                            </span>
                            <span className="tabular font-medium text-gray-900 dark:text-white">{money(value)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full vl-muted-bg" aria-hidden="true">
                            <div className="h-full rounded-full" style={{ width: `${thisMonth.expenses ? (value / thisMonth.expenses) * 100 : 0}%`, background: getCategoryColor(name) }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Stagger>
            </div>
          </div>

          {/* Recent transactions */}
          <Stagger delay={600}>
            <div className="vl-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-gray-800 md:px-6">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent transactions</h2>
                  <p className="mt-0.5 text-xs text-gray-400">Your last {recent.length || 8} entries</p>
                </div>
                <Link to="/transactions" className="vl-focus flex items-center gap-1 rounded text-xs font-medium text-indigo-600 transition-all duration-150 hover:gap-2 dark:text-indigo-400">
                  View all <Icon name="chevronRight" size={13} />
                </Link>
              </div>

              {loading ? (
                <>
                  <RowsSkeleton rows={5} />
                  {wakeHint && <p role="status" className="border-t border-gray-100 px-6 py-3 text-center text-xs text-gray-500 dark:border-gray-800">{WAKE_MESSAGE}</p>}
                </>
              ) : recent.length === 0 ? (
                <EmptyState
                  icon="wallet"
                  title="No transactions yet"
                  description="Add your first income or expense to get started."
                  action={<Button variant="primary" size="sm" onClick={() => navigate('/transactions')} leftIcon={<Icon name="plus" size={14} />}>Add transaction</Button>}
                />
              ) : (
                <>
                  <div className={`hidden border-b border-gray-100 bg-gray-50/60 px-6 py-2.5 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:bg-gray-900/50 md:grid md:items-center md:gap-4 ${ROW_COLS}`}>
                    <span>Category</span><span>Description</span><span>Date</span><span className="text-right">Amount</span><span className="text-right">Share</span><span className="sr-only">Actions</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recent.map((t, i) => (
                      <div
                        key={t.id}
                        className={`grid gap-2 px-4 py-3 transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800/50 md:items-center md:gap-4 md:px-6 ${ROW_COLS}`}
                        style={{ opacity: 0, animation: `fadeSlideIn 0.4s cubic-bezier(.4,0,.2,1) ${i * 40}ms forwards` }}
                      >
                        <div className="flex min-w-0 items-center gap-3 md:contents">
                          <span className={`w-fit max-w-[130px] shrink-0 truncate rounded-full px-2.5 py-1 text-xs font-medium ${getCategoryBadgeClasses(t.category, dark)}`}>{t.category}</span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{t.description || t.category}</p>
                            <p className="text-xs text-gray-400 md:hidden">{fmtDate(t.date)}</p>
                          </div>
                        </div>
                        <span className="tabular hidden text-sm text-gray-500 md:block">{fmtDate(t.date)}</span>
                        <div className="flex items-center justify-between md:contents">
                          <span className={`tabular text-sm font-semibold md:text-right ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {t.type === 'income' ? '+' : '-'}Rs. {Number(t.amount).toLocaleString('en-IN')}
                          </span>
                          <span className="tabular hidden text-right text-xs text-gray-400 md:block">
                            {(() => {
                              const base = t.type === 'income' ? stats.income : stats.expenses
                              return base ? `${((Number(t.amount) / base) * 100).toFixed(1)}%` : ''
                            })()}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setDeleteError(''); setToDelete(t) }}
                            aria-label={`Delete ${t.description || t.category}`}
                            className="vl-focus flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Stagger>
        </PageContainer>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete transaction?"
        message={`Delete the ${toDelete?.type === 'income' ? 'income' : 'expense'} of Rs. ${Number(toDelete?.amount || 0).toLocaleString()}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        loading={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </PageWrapper>
  )
}
