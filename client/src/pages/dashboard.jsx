import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import api from '../services/api'
import AppNav from '../components/AppNav'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function PageWrapper({ children }) {
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

function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current
    const end = value
    const duration = 900
    const startTime = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * ease))
      if (progress < 1) requestAnimationFrame(tick)
      else prev.current = end
    }
    requestAnimationFrame(tick)
  }, [value])
  return <span>{prefix}{display.toLocaleString()}{suffix}</span>
}

const categoryColors = {
  light: {
    Food:          'bg-orange-50 text-orange-700 border border-orange-200',
    Transport:     'bg-blue-50 text-blue-700 border border-blue-200',
    Shopping:      'bg-pink-50 text-pink-700 border border-pink-200',
    Bills:         'bg-red-50 text-red-700 border border-red-200',
    Entertainment: 'bg-purple-50 text-purple-700 border border-purple-200',
    Salary:        'bg-green-50 text-green-700 border border-green-200',
    Freelance:     'bg-teal-50 text-teal-700 border border-teal-200',
  },
  dark: {
    Food:          'bg-orange-900/40 text-orange-300 border border-orange-800',
    Transport:     'bg-blue-900/40 text-blue-300 border border-blue-800',
    Shopping:      'bg-pink-900/40 text-pink-300 border border-pink-800',
    Bills:         'bg-red-900/40 text-red-300 border border-red-800',
    Entertainment: 'bg-purple-900/40 text-purple-300 border border-purple-800',
    Salary:        'bg-green-900/40 text-green-300 border border-green-800',
    Freelance:     'bg-teal-900/40 text-teal-300 border border-teal-800',
  }
}

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const formatDate = () =>
  new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

export default function Dashboard() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const d = dark

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/transactions')
      const uniqueTransactions = Array.from(new Map((res.data || []).map(item => [item.id, item])).values())
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      setTransactions(uniqueTransactions)
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

        const uniqueTransactions = Array.from(new Map((res.data || []).map(item => [item.id, item])).values())
          .sort((a, b) => new Date(b.date) - new Date(a.date))

        setTransactions(uniqueTransactions)
      } catch (err) {
        console.error(err)
      } finally {
        if (isActive) setLoading(false)
      }
    }

    loadTransactions()

    return () => {
      isActive = false
    }
  }, [])

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await api.delete(`/transactions/${id}`)
      setTransactions(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  const income   = transactions.filter(t => t.type === 'income').reduce((a, b) => a + Number(b.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + Number(b.amount), 0)
  const balance  = income - expenses
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0
  const recent = transactions.slice(0, 5)

  const chartData = (() => {
    const months = {}
    transactions.forEach(t => {
      const key = new Date(t.date).toLocaleDateString('en-IN', { month: 'short' })
      if (!months[key]) months[key] = { month: key, income: 0, expenses: 0 }
      if (t.type === 'income') months[key].income += Number(t.amount)
      else months[key].expenses += Number(t.amount)
    })
    return Object.values(months).slice(-4)
  })()

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className={`rounded-xl px-4 py-3 border text-xs ${d ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
        <p className={`font-semibold mb-2 ${d ? 'text-gray-200' : 'text-gray-700'}`}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.fill }}>
            {p.name === 'income' ? 'Income' : 'Expenses'}: ₹{Number(p.value).toLocaleString()}
          </p>
        ))}
      </div>
    )
  }

  // reusable class strings
  const card = `rounded-2xl border p-5 h-full transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_40px_rgba(99,102,241,0.12)] ${d ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`
  const gridCard = `rounded-2xl border p-6 h-full transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_40px_rgba(99,102,241,0.12)] ${d ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`

  const insights = (() => {
    const list = []
    const expenseRate = income > 0 ? Math.round((expenses / income) * 100) : 0
    const topCat = (() => {
      const cats = {}
      transactions.filter(t => t.type === 'expense').forEach(t => {
        cats[t.category] = (cats[t.category] || 0) + Number(t.amount)
      })
      return Object.entries(cats).sort((a, b) => b[1] - a[1])[0]
    })()
    const thisMonth = transactions.filter(t => {
      const td = new Date(t.date), now = new Date()
      return td.getMonth() === now.getMonth() && td.getFullYear() === now.getFullYear()
    })
    const monthExp = thisMonth.filter(t => t.type === 'expense').reduce((a, b) => a + Number(b.amount), 0)
    const monthInc = thisMonth.filter(t => t.type === 'income').reduce((a, b) => a + Number(b.amount), 0)

    const toneMap = {
      green:  d ? 'bg-green-900/40 border-green-800 text-green-300'   : 'bg-green-50 border-green-200 text-green-700',
      amber:  d ? 'bg-amber-900/40 border-amber-800 text-amber-300'   : 'bg-amber-50 border-amber-200 text-amber-700',
      red:    d ? 'bg-red-900/40 border-red-800 text-red-300'         : 'bg-red-50 border-red-200 text-red-600',
      indigo: d ? 'bg-indigo-900/40 border-indigo-800 text-indigo-300': 'bg-indigo-50 border-indigo-200 text-indigo-600',
      blue:   d ? 'bg-blue-900/40 border-blue-800 text-blue-300'      : 'bg-blue-50 border-blue-200 text-blue-600',
      gray:   d ? 'bg-gray-800 border-gray-700 text-gray-300'         : 'bg-gray-50 border-gray-200 text-gray-600',
    }

    if (savingsRate >= 30)
      list.push({ tone: toneMap.green,  icon: '↑', text: `Your savings rate is ${savingsRate}% — that's excellent. Keep it up.` })
    else if (savingsRate > 0)
      list.push({ tone: toneMap.amber,  icon: '→', text: `Your savings rate is ${savingsRate}%. Try to push it above 30%.` })
    if (expenseRate > 80 && income > 0)
      list.push({ tone: toneMap.red,    icon: '!', text: `You're spending ${expenseRate}% of your income. Consider cutting non-essentials.` })
    if (topCat)
      list.push({ tone: toneMap.indigo, icon: '●', text: `${topCat[0]} is your highest expense category at ₹${topCat[1].toLocaleString()}.` })
    if (thisMonth.length > 0)
      list.push({ tone: toneMap.blue,   icon: '↗', text: `This month: ₹${monthInc.toLocaleString()} income, ₹${monthExp.toLocaleString()} expenses.` })
    if (list.length === 0)
      list.push({ tone: toneMap.gray,   icon: '→', text: 'Add more transactions to unlock detailed insights.' })

    return list
  })()

  return (
    <PageWrapper>
      <div className={`min-h-screen ${d ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <AppNav />

        <div className="max-w-6xl mx-auto px-6 py-8">

          {/* ── Header ── */}
          <Stagger delay={50}>
            <div className="mb-8 flex items-start justify-between">
              <div>
                <p className={`text-xs mb-1 ${d ? 'text-gray-500' : 'text-gray-400'}`}>{formatDate()}</p>
                <h2 className={`text-2xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>
                  {getGreeting()}, {user?.name}
                </h2>
                <p className={`text-sm mt-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
                  Here's your financial overview for today.
                </p>
              </div>
              <Link
                to="/transactions"
                className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add transaction
              </Link>
            </div>
          </Stagger>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

            {/* Balance */}
            <Stagger delay={100}>
              <div className="bg-indigo-600 rounded-2xl p-5 text-white h-full relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(99,102,241,0.35)] cursor-default">
                <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
                <div className="flex items-center justify-between mb-3">
                  <p className="text-indigo-200 text-xs font-medium uppercase tracking-wide">Total Balance</p>
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-2xl font-bold">₹<AnimatedNumber value={balance} /></p>
                <p className="text-indigo-300 text-xs mt-1">{transactions.length} total transactions</p>
              </div>
            </Stagger>

            {/* Income */}
            <Stagger delay={175}>
              <div className={card}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-medium uppercase tracking-wide ${d ? 'text-gray-500' : 'text-gray-400'}`}>Income</p>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${d ? 'bg-green-900/40' : 'bg-green-50'}`}>
                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </div>
                </div>
                <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>₹<AnimatedNumber value={income} /></p>
                <p className="text-green-500 text-xs mt-1 font-medium">
                  {transactions.filter(t => t.type === 'income').length} income entries
                </p>
              </div>
            </Stagger>

            {/* Expenses */}
            <Stagger delay={250}>
              <div className={card}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-medium uppercase tracking-wide ${d ? 'text-gray-500' : 'text-gray-400'}`}>Expenses</p>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${d ? 'bg-red-900/40' : 'bg-red-50'}`}>
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                    </svg>
                  </div>
                </div>
                <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>₹<AnimatedNumber value={expenses} /></p>
                <p className="text-red-400 text-xs mt-1 font-medium">
                  {transactions.filter(t => t.type === 'expense').length} expense entries
                </p>
              </div>
            </Stagger>

            {/* Savings Rate */}
            <Stagger delay={325}>
              <div className={card}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-xs font-medium uppercase tracking-wide ${d ? 'text-gray-500' : 'text-gray-400'}`}>Savings Rate</p>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${d ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <p className={`text-2xl font-bold ${d ? 'text-white' : 'text-gray-900'}`}>
                  <AnimatedNumber value={savingsRate} suffix="%" />
                </p>
                <div className="mt-2">
                  <div className={`w-full rounded-full h-1.5 overflow-hidden ${d ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min(savingsRate, 100)}%`, transition: 'width 1.2s cubic-bezier(.4,0,.2,1)' }}
                    />
                  </div>
                </div>
              </div>
            </Stagger>
          </div>

          {/* ── Chart + AI Insights ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

            <Stagger delay={400}>
              <div className={gridCard}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className={`font-semibold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>Monthly Overview</h3>
                    <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Income vs expenses by month</p>
                  </div>
                  <Link to="/analytics" className="text-xs text-indigo-500 hover:text-indigo-400 font-medium flex items-center gap-1 transition-all duration-150 hover:gap-2">
                    Full analytics
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barSize={12} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={d ? '#1f2937' : '#f3f4f6'} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: d ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: d ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                    <Bar dataKey="income" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                    <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>Income</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-red-400" />
                    <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>Expenses</span>
                  </div>
                </div>
              </div>
            </Stagger>

            <Stagger delay={475}>
              <div className={gridCard}>
                <div className="flex items-center gap-2 mb-5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${d ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className={`font-semibold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>AI Insights</h3>
                    <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>Based on your transactions</p>
                  </div>
                </div>
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>Add transactions to get insights</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {insights.map((ins, i) => (
                      <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border transition-transform duration-150 hover:-translate-y-0.5 ${ins.tone}`}>
                        <span className="text-xs font-bold mt-0.5 flex-shrink-0">{ins.icon}</span>
                        <p className="text-xs leading-relaxed">{ins.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Stagger>
          </div>

          {/* ── Recent Transactions ── */}
          <Stagger delay={550}>
            <div className={`rounded-2xl border overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_40px_rgba(99,102,241,0.12)] ${d ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <div className={`flex items-center justify-between px-6 py-4 border-b ${d ? 'border-gray-800' : 'border-gray-100'}`}>
                <div>
                  <h3 className={`font-semibold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>Recent Transactions</h3>
                  <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Your last 5 entries</p>
                </div>
                <Link to="/transactions" className="text-xs text-indigo-500 hover:text-indigo-400 font-medium flex items-center gap-1 transition-all duration-150 hover:gap-2">
                  View all
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center">
                  <svg className="w-5 h-5 animate-spin text-indigo-400 mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : recent.length === 0 ? (
                <div className="py-14 text-center px-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${d ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
                    <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className={`text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>No transactions yet</p>
                  <p className={`text-xs mb-4 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Add your first income or expense to get started</p>
                  <Link
                    to="/transactions"
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-medium px-4 py-2 rounded-lg transition-all duration-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add transaction
                  </Link>
                </div>
              ) : (
                <div className={`divide-y ${d ? 'divide-gray-800' : 'divide-gray-50'}`}>
                  {recent.map((t, i) => (
                    <div
                      key={t.id}
                      className={`flex items-center justify-between px-6 py-4 transition-colors duration-150 group ${d ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50'}`}
                      style={{
                        opacity: 0,
                        animation: `fadeSlideIn 0.4s cubic-bezier(.4,0,.2,1) ${550 + i * 60}ms forwards`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`text-xs px-2.5 py-1 rounded-full font-medium ${(d ? categoryColors.dark : categoryColors.light)[t.category] || (d ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'bg-gray-100 text-gray-600 border border-gray-200')}`}>
                          {t.category}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${d ? 'text-gray-100' : 'text-gray-900'}`}>{t.description || t.category}</p>
                          <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>
                            {new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-400'}`}>
                          {t.type === 'income' ? '+' : '-'}₹{Number(t.amount).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDelete(t.id)}
                          disabled={deletingId === t.id}
                          className={`opacity-0 group-hover:opacity-100 transition-all duration-150 w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-50 ${d ? 'text-gray-600 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                        >
                          {deletingId === t.id ? (
                            <svg className="w-3.5 h-3.5 animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Stagger>

        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </PageWrapper>
  )
}