import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import AppNav from '../components/AppNav'
import { useTheme } from '../context/ThemeContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Sector
} from 'recharts'

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
  Income: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 13V3M8 3L4 7M8 3l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Expense: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M8 13l-4-4M8 13l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Savings: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="9" r="1.5" fill="currentColor"/>
    </svg>
  ),
  Rate: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 11L6 7l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Close: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.25"/>
      <path d="M7 6.5v3.5M7 4.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Chart: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="9" width="3" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="6.5" y="6" width="3" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="11" y="3" width="3" height="11" rx="1" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  Trend: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 12L6 7.5l3 2.5 5-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 3h3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Food: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M5 2v4a2 2 0 002 2h0a2 2 0 002-2V2M7 8v5M2 4h3M10 2v11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Transport: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="2" y="4" width="11" height="7" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="4.5" cy="11.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="10.5" cy="11.5" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 7.5h11" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Shopping: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M3 3h9l-1.2 6H4.2L3 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="5.5" cy="12" r="1" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="10" cy="12" r="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 1h1.5L3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Bills: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="3" y="1.5" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5.5 5h4M5.5 7.5h4M5.5 10h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Entertainment: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M6 5.5l4 2-4 2V5.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  ),
  Default: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 7.5h5M7.5 5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Salary: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 4V3a2.5 2.5 0 015 0v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="7.5" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  Freelance: () => (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="2" y="2" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 13h5M7.5 11v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M5.5 6.5l1.5 1.5 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Warning: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1.5L13 12.5H1L7 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M7 5.5v3M7 10v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Star: () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1l1.4 3h3.1l-2.5 1.9 1 3L6 7.3 3 8.9l1-3L1.5 4H4.6L6 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
    </svg>
  ),
}

const getCategoryIcon = (name) => {
  const map = {
    food: Icons.Food,
    transport: Icons.Transport,
    shopping: Icons.Shopping,
    bills: Icons.Bills,
    entertainment: Icons.Entertainment,
    salary: Icons.Salary,
    freelance: Icons.Freelance,
  }
  return map[name?.toLowerCase()] || Icons.Default
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function PageWrapper({ children }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(10px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }}>{children}</div>
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
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.45s ease, transform 0.45s ease',
    }}>{children}</div>
  )
}

const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e', '#64748b']
const money = (v) => `Rs. ${Number(v || 0).toLocaleString()}`

const categoryAdvice = {
  food: { tip: (pct) => pct > 35 ? `Food accounts for ${pct}% of your expenses — above the recommended threshold. Meal planning and reducing dining out can meaningfully reduce this.` : `Food at ${pct}% is within a healthy range. Monitor the split between home cooking and dining out for further optimisation.` },
  transport: { tip: (pct) => pct > 25 ? `Transport is consuming ${pct}% of your budget. Consolidating errands and using public transit where possible can reduce this.` : `Transport at ${pct}% is reasonable. Batching trips and ride-sharing are useful levers if cuts are needed.` },
  shopping: { tip: (pct) => pct > 30 ? `Shopping represents ${pct}% of your expenses. A 48-hour review period before non-essential purchases is an effective way to reduce impulse spend.` : `Shopping at ${pct}% is controlled. Maintaining a monthly wishlist review helps prevent accumulation over time.` },
  bills: { tip: (pct) => pct > 40 ? `Bills are absorbing ${pct}% of your expenses. An audit of recurring subscriptions and fixed costs is recommended — dormant services are a common culprit.` : `Bills at ${pct}% is manageable. An annual review of all recurring charges ensures nothing unnecessary accumulates.` },
  entertainment: { tip: (pct) => pct > 20 ? `Entertainment is at ${pct}%. Consider consolidating or sharing subscriptions to trim this without significantly impacting your lifestyle.` : `Entertainment at ${pct}% is well-managed.` },
  salary: { tip: () => `This is income, not an expense. Consistent tracking ensures your savings rate calculation stays accurate.` },
  freelance: { tip: () => `Freelance income carries variability risk. Setting aside a fixed percentage per payment — typically 25–30% — creates a reliable tax and savings buffer.` },
  default: { tip: (pct) => `This category accounts for ${pct}% of your expenses. Continued tracking will surface trends over time.` },
}

const getCategoryAdvice = (name) => {
  const key = Object.keys(categoryAdvice).find(k => k === name?.toLowerCase()) || 'default'
  return categoryAdvice[key]
}

const CustomTooltip = ({ active, payload, label, dark }) => {
  if (!active || !payload?.length) return null
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 shadow-lg text-xs ${dark ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-700'}`}>
      <p className={`font-medium mb-1.5 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>{label}</p>
      {payload.map((item, i) => (
        <p key={i} style={{ color: item.color || item.fill }}>{item.name}: {money(item.value)}</p>
      ))}
    </div>
  )
}

const renderActivePieSlice = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} style={{ filter: 'drop-shadow(0 6px 12px rgba(99,102,241,0.18))' }} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 14} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.3} />
    </g>
  )
}

// ─── Modal shell (centered) ───────────────────────────────────────────────────
function Modal({ dark, onClose, icon: Icon, title, subtitle, children }) {
  const [visible, setVisible] = useState(false)

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Lock page scroll while modal is open — this is the real fix
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const headerBg = dark ? '#111827' : '#ffffff'
  const borderColor = dark ? '#1f2937' : '#e5e7eb'
  const bg = dark ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Outer centering shell — fixed to viewport, never affected by scroll */}
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          pointerEvents: 'none',
        }}
      >
        {/* Modal card */}
        <div
          style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            pointerEvents: 'auto',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
            transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(.4,0,.2,1)',
            overflow: 'hidden',
          }}
          className={`rounded-2xl border shadow-2xl ${bg}`}
        >
          {/* Header */}
          <div
            style={{ borderBottom: `1px solid ${borderColor}`, backgroundColor: headerBg, flexShrink: 0 }}
            className="flex items-center justify-between px-6 pt-5 pb-4"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                {Icon && <Icon />}
              </div>
              <div>
                <h3 className={`font-semibold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                {subtitle && <p className={`text-xs mt-0.5 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${dark ? 'hover:bg-gray-800 text-gray-500 hover:text-gray-300' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
            >
              <Icons.Close />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }} className="px-6 py-5 space-y-4">
            {children}
          </div>

          {/* Footer */}
          <div
            style={{ borderTop: `1px solid ${borderColor}`, backgroundColor: headerBg, flexShrink: 0 }}
            className="px-6 py-4"
          >
            <button
              onClick={onClose}
              className={`w-full text-xs font-medium py-2.5 rounded-xl transition-colors ${dark ? 'bg-gray-800 hover:bg-gray-700 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function Callout({ dark, variant = 'neutral', label, children }) {
  const styles = {
    neutral: dark ? 'bg-gray-800/60 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600',
    positive: dark ? 'bg-emerald-900/20 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: dark ? 'bg-amber-900/20 border-amber-800/60 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700',
    negative: dark ? 'bg-red-900/20 border-red-800/60 text-red-300' : 'bg-red-50 border-red-200 text-red-700',
  }
  const iconColor = {
    neutral: dark ? 'text-gray-500' : 'text-gray-400',
    positive: dark ? 'text-emerald-400' : 'text-emerald-500',
    warning: dark ? 'text-amber-400' : 'text-amber-500',
    negative: dark ? 'text-red-400' : 'text-red-500',
  }
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${styles[variant]}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={iconColor[variant]}><Icons.Info /></span>
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70">{label}</p>
      </div>
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  )
}

function StatRow({ dark, label, value, sub }) {
  const border = dark ? 'border-gray-800' : 'border-gray-100'
  const subtle = dark ? 'text-gray-500' : 'text-gray-400'
  return (
    <div className={`flex items-center justify-between py-2.5 border-b last:border-0 ${border}`}>
      <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <div className="text-right">
        <p className="text-xs font-semibold">{value}</p>
        {sub && <p className={`text-[10px] mt-0.5 ${subtle}`}>{sub}</p>}
      </div>
    </div>
  )
}

function MetricBadge({ dark, color, label, value, sub }) {
  const palette = {
    green: dark ? 'bg-emerald-900/20 border-emerald-800/50 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: dark ? 'bg-red-900/20 border-red-800/50 text-red-300' : 'bg-red-50 border-red-200 text-red-500',
    indigo: dark ? 'bg-indigo-900/20 border-indigo-800/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-600',
    amber: dark ? 'bg-amber-900/20 border-amber-800/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-600',
  }
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${palette[color]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 opacity-60">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-[11px] mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

// ─── Modal content components ─────────────────────────────────────────────────
function IncomeModal({ dark, transactions, income, monthlyData, onClose }) {
  const incomeTxns = transactions.filter(t => t.type === 'income').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
  const avgMonthly = monthlyData.length ? Math.round(monthlyData.reduce((s, m) => s + m.income, 0) / monthlyData.length) : 0
  const bestMonth = monthlyData.reduce((best, m) => m.income > (best?.income || 0) ? m : best, null)
  const advice = income === 0
    ? 'No income recorded yet. Begin logging salary or freelance payments to establish a complete financial picture.'
    : `Average monthly income is ${money(avgMonthly)}. Consistent tracking enables accurate savings rate calculations.`

  return (
    <Modal dark={dark} onClose={onClose} icon={Icons.Income} title="Income Overview" subtitle="All-time income summary">
      <MetricBadge dark={dark} color="green" label="Total Income" value={money(income)} sub={`${transactions.filter(t => t.type === 'income').length} transactions recorded`} />
      <Callout dark={dark} variant="positive" label="Analysis">{advice}</Callout>

      {monthlyData.length > 0 && (
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Monthly Breakdown</p>
          <div className={`rounded-xl border overflow-hidden ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            {monthlyData.map(m => (
              <StatRow key={m.month} dark={dark} label={m.month} value={money(m.income)}
                sub={bestMonth?.month === m.month ? 'Highest month' : undefined} />
            ))}
          </div>
        </div>
      )}

      {incomeTxns.length > 0 && (
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Recent Transactions</p>
          <div className="space-y-0.5">
            {incomeTxns.map((t) => (
              <div key={t.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${dark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
                <div>
                  <p className={`text-xs font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{t.description || t.category}</p>
                  <p className={`text-[10px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <p className="text-xs font-semibold text-emerald-500">+{money(t.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function ExpensesModal({ dark, transactions, expenses, monthlyData, categoryData, onClose }) {
  const expTxns = transactions.filter(t => t.type === 'expense').sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
  const worstMonth = monthlyData.reduce((w, m) => m.expense > (w?.expense || 0) ? m : w, null)
  const advice = expenses === 0
    ? 'No expenses recorded. Start logging transactions to track spending patterns.'
    : worstMonth
      ? `Peak spending occurred in ${worstMonth.month} at ${money(worstMonth.expense)}. Reviewing that period may reveal reducible costs.`
      : 'Continue logging to identify your highest-cost periods.'

  return (
    <Modal dark={dark} onClose={onClose} icon={Icons.Expense} title="Expense Overview" subtitle="Spending breakdown by period">
      <MetricBadge dark={dark} color="red" label="Total Expenses" value={money(expenses)} sub={`${transactions.filter(t => t.type === 'expense').length} transactions recorded`} />
      <Callout dark={dark} variant="warning" label="Analysis">{advice}</Callout>

      {categoryData.length > 0 && (
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Top Categories</p>
          <div className={`rounded-xl border overflow-hidden ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            {categoryData.slice(0, 4).map((cat, i) => {
              const pct = expenses ? Math.round((cat.value / expenses) * 100) : 0
              return (
                <StatRow key={cat.name} dark={dark}
                  label={<span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{cat.name}</span>}
                  value={money(cat.value)} sub={`${pct}% of total`} />
              )
            })}
          </div>
        </div>
      )}

      {monthlyData.length > 0 && (
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Monthly Spending</p>
          <div className={`rounded-xl border overflow-hidden ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            {monthlyData.map(m => (
              <StatRow key={m.month} dark={dark} label={m.month} value={money(m.expense)}
                sub={worstMonth?.month === m.month ? 'Highest month' : undefined} />
            ))}
          </div>
        </div>
      )}

      {expTxns.length > 0 && (
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Recent Transactions</p>
          <div className="space-y-0.5">
            {expTxns.map((t) => (
              <div key={t.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${dark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
                <div>
                  <p className={`text-xs font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{t.description || t.category}</p>
                  <p className={`text-[10px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <p className="text-xs font-semibold text-red-500">−{money(t.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function NetSavingsModal({ dark, income, expenses, netSavings, monthlyData, onClose }) {
  const isPositive = netSavings >= 0
  const extraPerYear = income > 0 ? Math.round((income * 0.05) * 12) : 0
  const advice = income === 0
    ? 'Add income and expense entries to calculate net savings.'
    : isPositive
      ? `Net savings of ${money(netSavings)} recorded. Increasing the savings rate by 5% would compound to an additional ${money(extraPerYear)} annually.`
      : `Current spending exceeds income by ${money(Math.abs(netSavings))}. Targeting the largest expense category first yields the fastest improvement.`
  const bestMonth = monthlyData.reduce((b, m) => m.savings > (b?.savings ?? -Infinity) ? m : b, null)

  return (
    <Modal dark={dark} onClose={onClose} icon={Icons.Savings} title="Net Savings" subtitle="Income minus total expenses">
      <MetricBadge dark={dark} color={isPositive ? 'indigo' : 'red'} label="Net Savings"
        value={money(netSavings)} sub={`${money(income)} income − ${money(expenses)} expenses`} />
      <Callout dark={dark} variant={isPositive ? 'positive' : 'warning'} label="Analysis">{advice}</Callout>

      {monthlyData.length > 0 && (
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Savings by Month</p>
          <div className={`rounded-xl border overflow-hidden ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
            {monthlyData.map(m => (
              <StatRow key={m.month} dark={dark} label={m.month}
                value={<span className={m.savings >= 0 ? 'text-indigo-500' : 'text-red-500'}>{money(m.savings)}</span>}
                sub={bestMonth?.month === m.month && m.savings > 0 ? 'Best month' : undefined} />
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function SavingsRateModal({ dark, savingsRate, income, onClose }) {
  const isGood = savingsRate >= 20
  const gap = Math.max(0, 20 - savingsRate)
  const amountToReach20 = income > 0 ? Math.round((gap / 100) * income) : 0
  const advice = income === 0
    ? 'Record income to calculate your savings rate.'
    : isGood
      ? `At ${savingsRate}%, you are above the recommended 20% benchmark. This is a strong and sustainable financial position.`
      : `Current savings rate is ${savingsRate}%. An additional ${money(amountToReach20)} saved monthly would reach the 20% benchmark.`

  const benchmarks = [
    { label: 'Critical', range: '0–5%', active: savingsRate >= 0 && savingsRate < 5, variant: 'negative' },
    { label: 'Developing', range: '5–15%', active: savingsRate >= 5 && savingsRate < 15, variant: 'warning' },
    { label: 'Healthy', range: '15–30%', active: savingsRate >= 15 && savingsRate < 30, variant: 'positive' },
    { label: 'Strong', range: '30%+', active: savingsRate >= 30, variant: 'positive' },
  ]

  return (
    <Modal dark={dark} onClose={onClose} icon={Icons.Rate} title="Savings Rate" subtitle="Percentage of income retained">
      <div className={`rounded-xl border px-4 py-4 ${isGood ? (dark ? 'bg-emerald-900/15 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200') : (dark ? 'bg-amber-900/15 border-amber-800/50' : 'bg-amber-50 border-amber-200')}`}>
        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${isGood ? (dark ? 'text-emerald-400' : 'text-emerald-600') : (dark ? 'text-amber-400' : 'text-amber-600')}`}>Savings Rate</p>
        <p className={`text-3xl font-bold ${isGood ? (dark ? 'text-emerald-300' : 'text-emerald-700') : (dark ? 'text-amber-300' : 'text-amber-700')}`}>{savingsRate}%</p>
        <div className={`mt-3 h-1.5 rounded-full ${isGood ? (dark ? 'bg-emerald-900/40' : 'bg-emerald-100') : (dark ? 'bg-amber-900/40' : 'bg-amber-100')}`}>
          <div className="h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(savingsRate, 100)}%`, backgroundColor: isGood ? '#10b981' : '#f59e0b' }} />
        </div>
        <p className={`text-[11px] mt-2 ${isGood ? (dark ? 'text-emerald-400' : 'text-emerald-600') : (dark ? 'text-amber-400' : 'text-amber-600')}`}>
          Target: 20% — {isGood ? `${savingsRate - 20}% above target` : `${gap}% below target`}
        </p>
      </div>

      <Callout dark={dark} variant={isGood ? 'positive' : 'warning'} label="Analysis">{advice}</Callout>

      <div>
        <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Benchmarks</p>
        <div className="grid grid-cols-2 gap-2">
          {benchmarks.map(b => (
            <div key={b.label} className={`rounded-xl px-3 py-2.5 border text-center transition-colors ${b.active ? (dark ? 'bg-indigo-900/25 border-indigo-700/60' : 'bg-indigo-50 border-indigo-200') : (dark ? 'bg-gray-800/40 border-gray-700/50' : 'bg-gray-50 border-gray-100')}`}>
              <p className={`text-[10px] font-semibold ${b.active ? (dark ? 'text-indigo-300' : 'text-indigo-600') : (dark ? 'text-gray-500' : 'text-gray-400')}`}>{b.label}</p>
              <p className={`text-xs mt-0.5 font-medium ${b.active ? (dark ? 'text-indigo-200' : 'text-indigo-700') : (dark ? 'text-gray-600' : 'text-gray-400')}`}>{b.range}</p>
              {b.active && <p className={`text-[10px] mt-0.5 ${dark ? 'text-indigo-400' : 'text-indigo-500'}`}>You are here</p>}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function IncomeExpensesModal({ dark, monthlyData, onClose }) {
  const bestMonth = monthlyData.reduce((b, m) => (m.income - m.expense) > ((b?.income || 0) - (b?.expense || 0)) ? m : b, null)
  const worstMonth = monthlyData.reduce((w, m) => (m.income - m.expense) < ((w?.income || 0) - (w?.expense || 0)) ? m : w, null)
  const advice = monthlyData.length === 0
    ? 'Add transactions across multiple months to surface trends.'
    : bestMonth
      ? `Strongest period was ${bestMonth.month} with a net surplus of ${money(bestMonth.income - bestMonth.expense)}. Replicating those spending habits consistently is the priority.`
      : 'Continue logging to identify financial patterns.'

  return (
    <Modal dark={dark} onClose={onClose} icon={Icons.Chart} title="Income vs Expenses" subtitle="Monthly comparison">
      <Callout dark={dark} variant="neutral" label="Analysis">{advice}</Callout>

      {monthlyData.length > 0 && (
        <>
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Month by Month</p>
            <div className={`rounded-xl border overflow-hidden ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
              {monthlyData.map(m => {
                const net = m.income - m.expense
                return (
                  <div key={m.month} className={`px-4 py-3 border-b last:border-0 ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className={`text-xs font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{m.month}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${net >= 0 ? (dark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600') : (dark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-500')}`}>
                        {net >= 0 ? '+' : ''}{money(net)}
                      </span>
                    </div>
                    <div className={`flex gap-3 text-[11px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                      <span className="text-emerald-500">↑ {money(m.income)}</span>
                      <span>·</span>
                      <span className="text-red-400">↓ {money(m.expense)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {(bestMonth || worstMonth) && (
            <div className="grid grid-cols-2 gap-3">
              {bestMonth && (
                <div className={`rounded-xl p-3 border text-center ${dark ? 'bg-emerald-900/15 border-emerald-800/40' : 'bg-emerald-50 border-emerald-100'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>Best Month</p>
                  <p className={`text-sm font-bold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>{bestMonth.month}</p>
                  <p className={`text-[10px] mt-0.5 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>+{money(bestMonth.income - bestMonth.expense)}</p>
                </div>
              )}
              {worstMonth && (
                <div className={`rounded-xl p-3 border text-center ${dark ? 'bg-amber-900/15 border-amber-800/40' : 'bg-amber-50 border-amber-100'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${dark ? 'text-amber-400' : 'text-amber-600'}`}>Watch Period</p>
                  <p className={`text-sm font-bold ${dark ? 'text-amber-300' : 'text-amber-700'}`}>{worstMonth.month}</p>
                  <p className={`text-[10px] mt-0.5 ${dark ? 'text-amber-400' : 'text-amber-600'}`}>{money(worstMonth.income - worstMonth.expense)}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

function SavingsTrendModal({ dark, monthlyData, onClose }) {
  const posMonths = monthlyData.filter(m => m.savings > 0)
  const negMonths = monthlyData.filter(m => m.savings < 0)
  const best = monthlyData.reduce((b, m) => m.savings > (b?.savings ?? -Infinity) ? m : b, null)
  const advice = monthlyData.length === 0
    ? 'Add transactions to begin tracking your savings trend.'
    : posMonths.length === monthlyData.length
      ? 'Positive savings recorded across all tracked months — a consistent and disciplined pattern.'
      : negMonths.length > 0
        ? `${negMonths.length} month${negMonths.length > 1 ? 's' : ''} recorded with spending exceeding income. Reviewing those periods will identify correctable patterns.`
        : 'Savings trajectory is establishing. Continue logging for stronger signal.'

  return (
    <Modal dark={dark} onClose={onClose} icon={Icons.Trend} title="Savings Trend" subtitle="Net savings over time">
      <Callout dark={dark} variant={negMonths.length > 0 ? 'warning' : 'positive'} label="Analysis">{advice}</Callout>

      {monthlyData.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className={`rounded-xl p-3 border text-center ${dark ? 'bg-gray-800/40 border-gray-700/50' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-[10px] mb-1 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Tracked</p>
              <p className="text-lg font-bold text-indigo-500">{monthlyData.length}</p>
            </div>
            <div className={`rounded-xl p-3 border text-center ${dark ? 'bg-emerald-900/15 border-emerald-800/40' : 'bg-emerald-50 border-emerald-100'}`}>
              <p className={`text-[10px] mb-1 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`}>Positive</p>
              <p className="text-lg font-bold text-emerald-500">{posMonths.length}</p>
            </div>
            <div className={`rounded-xl p-3 border text-center ${dark ? 'bg-red-900/15 border-red-800/40' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-[10px] mb-1 ${dark ? 'text-red-400' : 'text-red-500'}`}>Negative</p>
              <p className="text-lg font-bold text-red-400">{negMonths.length}</p>
            </div>
          </div>

          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Month by Month</p>
            <div className={`rounded-xl border overflow-hidden ${dark ? 'border-gray-800' : 'border-gray-100'}`}>
              {monthlyData.map(m => (
                <StatRow key={m.month} dark={dark} label={m.month}
                  value={<span className={m.savings >= 0 ? 'text-emerald-500' : 'text-red-400'}>{m.savings >= 0 ? '+' : ''}{money(m.savings)}</span>}
                  sub={best?.month === m.month && m.savings > 0 ? 'Best period' : m.savings < 0 ? 'Overspent' : undefined} />
              ))}
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}

function CategoryModal({ category, transactions, totalExpenses, colorIndex, dark, onClose }) {
  if (!category) return null
  const color = COLORS[colorIndex % COLORS.length]
  const pct = totalExpenses > 0 ? Math.round((category.value / totalExpenses) * 100) : 0
  const advice = getCategoryAdvice(category.name)
  const CatIcon = getCategoryIcon(category.name)
  const catTxns = transactions
    .filter(t => t.type === 'expense' && t.category?.toLowerCase() === category.name?.toLowerCase())
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)

  return (
    <Modal dark={dark} onClose={onClose} icon={CatIcon} title={category.name} subtitle={`${pct}% of total expenses`}>
      <div className="rounded-xl border px-4 py-4" style={{ backgroundColor: color + '10', borderColor: color + '28' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color, opacity: 0.7 }}>Total Spent</p>
        <p className="text-2xl font-bold" style={{ color }}>{money(category.value)}</p>
        <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: color + '20' }}>
          <div className="h-1.5 rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <p className={`text-[11px] mt-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{pct}% of {money(totalExpenses)} total expenses</p>
      </div>

      <Callout dark={dark} variant={pct > 30 ? 'warning' : 'neutral'} label="Recommendation">{advice.tip(pct)}</Callout>

      {catTxns.length > 0 && (
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Recent Transactions</p>
          <div className="space-y-0.5">
            {catTxns.map((t) => (
              <div key={t.id} className={`flex items-center justify-between px-3 py-2.5 rounded-xl ${dark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'} transition-colors`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '15', color }}>
                    <CatIcon />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium truncate ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{t.description || t.category}</p>
                    <p className={`text-[10px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-red-500 flex-shrink-0 ml-3">−{money(t.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── View Details button ──────────────────────────────────────────────────────
function ViewDetailsBtn({ dark, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`mt-4 w-full flex items-center justify-center gap-1.5 text-[11px] font-medium py-2 rounded-lg border transition-colors ${dark ? 'border-gray-700/60 text-gray-500 hover:border-gray-600 hover:text-gray-300 hover:bg-gray-800/50' : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50'}`}
    >
      View details
      <Icons.ArrowRight />
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const { dark } = useTheme()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0)
  const [panel, setPanel] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0)

  const openPanel = (name) => setPanel(name)
  const closePanel = () => { setPanel(null); setSelectedCategory(null) }

  useEffect(() => {
    api.get('/transactions').then(r => setTransactions(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const categoryData = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const ex = acc.find(i => i.name === t.category)
      if (ex) ex.value += Number(t.amount)
      else acc.push({ name: t.category, value: Number(t.amount) })
      return acc
    }, [])
    .sort((a, b) => b.value - a.value)

  const monthlyData = transactions.reduce((acc, t) => {
    const month = new Date(t.date).toLocaleString('en-IN', { month: 'short' })
    const ex = acc.find(i => i.month === month)
    if (ex) {
      if (t.type === 'income') ex.income += Number(t.amount)
      else ex.expense += Number(t.amount)
      ex.savings = ex.income - ex.expense
    } else {
      const inc = t.type === 'income' ? Number(t.amount) : 0
      const exp = t.type === 'expense' ? Number(t.amount) : 0
      acc.push({ month, income: inc, expense: exp, savings: inc - exp })
    }
    return acc
  }, [])

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const netSavings = income - expenses
  const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0
  const expenseRate = income > 0 ? Math.round((expenses / income) * 100) : 0
  const topCategory = categoryData[0]
  const activeCategory = categoryData[activeCategoryIndex] || categoryData[0]
  const averageExpense = categoryData.length ? Math.round(expenses / categoryData.length) : 0

  // ─── Styling ───────────────────────────────────────────────────────────────
  const cardClass = `rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(99,102,241,0.10)] ${dark ? 'bg-gray-900 border-gray-800 text-gray-100 hover:border-gray-700' : 'bg-white border-gray-200 text-gray-900 hover:border-indigo-100'}`
  const subtle = dark ? 'text-gray-500' : 'text-gray-400'
  const sectionLabel = `text-[11px] font-semibold uppercase tracking-widest ${subtle}`

  const summaryCards = [
    { key: 'income',      label: 'Total Income',    value: money(income),      color: 'text-emerald-600', panelKey: 'income',      Icon: Icons.Income  },
    { key: 'expenses',    label: 'Total Expenses',   value: money(expenses),    color: 'text-red-500',     panelKey: 'expenses',    Icon: Icons.Expense },
    { key: 'savings',     label: 'Net Savings',      value: money(netSavings),  color: netSavings >= 0 ? 'text-indigo-500' : 'text-red-500', panelKey: 'savings', Icon: Icons.Savings },
    { key: 'savingsRate', label: 'Savings Rate',     value: `${savingsRate}%`,  color: savingsRate >= 20 ? 'text-emerald-600' : 'text-amber-500', panelKey: 'savingsRate', Icon: Icons.Rate },
  ]

  const insights = [
    topCategory
      ? { variant: 'neutral', title: 'Largest expense category', text: `${topCategory.name} leads at ${money(topCategory.value)}, representing ${expenses ? Math.round((topCategory.value / expenses) * 100) : 0}% of total expenses.` }
      : { variant: 'neutral', title: 'No expense data', text: 'Add expense transactions to unlock category insights.' },
    savingsRate >= 20
      ? { variant: 'positive', title: 'Savings on track', text: `Savings rate of ${savingsRate}% exceeds the 20% benchmark. Strong financial position.` }
      : { variant: 'warning', title: 'Savings below target', text: income > 0 ? `Current savings rate is ${savingsRate}%. The recommended minimum is 20%.` : 'Add income entries to calculate your savings rate.' },
    transactions.length >= 5
      ? { variant: 'neutral', title: 'Data confidence', text: `${transactions.length} transactions provide a reliable analytical base.` }
      : { variant: 'neutral', title: 'Limited data', text: 'Add at least 5 transactions to surface meaningful patterns.' },
  ]

  const insightStyles = {
    neutral: dark ? 'bg-gray-900 border-gray-700/70 text-gray-300' : 'bg-white border-gray-200 text-gray-600',
    positive: dark ? 'bg-emerald-900/15 border-emerald-800/50 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700',
    warning: dark ? 'bg-amber-900/15 border-amber-800/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700',
  }

  const insightDotColor = {
    neutral: dark ? 'bg-gray-600' : 'bg-gray-300',
    positive: 'bg-emerald-500',
    warning: 'bg-amber-500',
  }

  return (
    <PageWrapper>
      <div className={`min-h-screen ${dark ? 'bg-gray-950' : 'bg-gray-50/60'}`}>
        <AppNav />
        <div className="max-w-6xl mx-auto px-6 py-8">

          {/* Page header */}
          <Stagger delay={40}>
            <div className="mb-8">
              <p className={`text-xs font-medium uppercase tracking-widest mb-2 ${subtle}`}>Financial analytics</p>
              <h2 className={`text-2xl font-semibold tracking-tight ${dark ? 'text-white' : 'text-gray-900'}`}>Overview</h2>
              <p className={`text-sm mt-1.5 max-w-md ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Transaction patterns, category breakdowns, and savings signals across your recorded history.</p>
            </div>
          </Stagger>

          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className={`text-xs ${subtle}`}>Loading transactions…</span>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {summaryCards.map((stat, i) => (
                  <Stagger key={stat.key} delay={80 + i * 60}>
                    <div className={`${cardClass} p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className={`text-xs font-medium ${subtle}`}>{stat.label}</p>
                        <span className={dark ? 'text-gray-600' : 'text-gray-400'}><stat.Icon /></span>
                      </div>
                      <p className={`text-xl font-bold tracking-tight ${stat.color}`}>{stat.value}</p>
                      <p className={`text-[11px] mt-1.5 ${subtle}`}>{transactions.length} entries</p>
                      <ViewDetailsBtn dark={dark} onClick={() => openPanel(stat.panelKey)} />
                    </div>
                  </Stagger>
                ))}
              </div>

              {/* Insight strip */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
                {insights.map((ins, i) => (
                  <Stagger key={ins.title} delay={320 + i * 60}>
                    <div className={`rounded-xl border px-4 py-3.5 h-full ${insightStyles[ins.variant]}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${insightDotColor[ins.variant]}`} />
                        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">{ins.title}</p>
                      </div>
                      <p className="text-xs leading-relaxed">{ins.text}</p>
                    </div>
                  </Stagger>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Bar chart */}
                <Stagger delay={480}>
                  <div className={`${cardClass} p-6`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Income vs Expenses</h3>
                      <span className={dark ? 'text-gray-600' : 'text-gray-400'}><Icons.Chart /></span>
                    </div>
                    <p className={`text-xs mb-4 ${subtle}`}>Monthly comparison</p>
                    {monthlyData.length === 0 ? (
                      <p className={`text-sm text-center py-14 ${subtle}`}>No monthly data yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthlyData} barSize={14} barGap={4}>
                          <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#1f2937' : '#f3f4f6'} vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: dark ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: dark ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                          <Tooltip content={<CustomTooltip dark={dark} />} cursor={{ fill: dark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)' }} />
                          <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" isAnimationActive animationDuration={900} />
                          <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" isAnimationActive animationDuration={1100} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    <ViewDetailsBtn dark={dark} onClick={() => openPanel('chartIncome')} />
                  </div>
                </Stagger>

                {/* Pie chart */}
                <Stagger delay={540}>
                  <div className={`${cardClass} p-6`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Spending by Category</h3>
                      <span className={dark ? 'text-gray-600' : 'text-gray-400'}><Icons.Expense /></span>
                    </div>
                    <p className={`text-xs mb-4 ${subtle}`}>Click a segment for details</p>
                    {categoryData.length === 0 ? (
                      <p className={`text-sm text-center py-14 ${subtle}`}>No expense data yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" style={{ fill: dark ? '#f3f4f6' : '#111827', fontSize: 13, fontWeight: 600 }}>{activeCategory?.name}</text>
                          <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" style={{ fill: dark ? '#6b7280' : '#9ca3af', fontSize: 11 }}>{activeCategory ? money(activeCategory.value) : ''}</text>
                          <Pie
                            data={categoryData} cx="50%" cy="50%"
                            activeIndex={activeCategoryIndex} activeShape={renderActivePieSlice}
                            innerRadius={48} outerRadius={82} paddingAngle={3}
                            dataKey="value" nameKey="name"
                            isAnimationActive animationDuration={1100}
                            onMouseEnter={(_, i) => setActiveCategoryIndex(i)}
                            onClick={(_, i) => { setSelectedCategory(categoryData[i]); setSelectedCategoryIndex(i); openPanel('category') }}
                          >
                            {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" className="cursor-pointer" />)}
                          </Pie>
                          <Tooltip formatter={(v, n) => [money(v), n]} contentStyle={{ backgroundColor: dark ? '#111827' : '#fff', border: dark ? '1px solid #374151' : '1px solid #e5e7eb', borderRadius: 12, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    <ViewDetailsBtn dark={dark} onClick={() => { if (categoryData[0]) { setSelectedCategory(categoryData[0]); setSelectedCategoryIndex(0); openPanel('category') } }} />
                  </div>
                </Stagger>
              </div>

              {/* Bottom row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Savings trend line chart */}
                <Stagger delay={600}>
                  <div className={`${cardClass} p-6 lg:col-span-2`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Savings Trend</h3>
                      <span className={dark ? 'text-gray-600' : 'text-gray-400'}><Icons.Trend /></span>
                    </div>
                    <p className={`text-xs mb-4 ${subtle}`}>Net savings by month</p>
                    {monthlyData.length === 0 ? (
                      <p className={`text-sm text-center py-12 ${subtle}`}>No trend data yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#1f2937' : '#f3f4f6'} vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: dark ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: dark ? '#6b7280' : '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                          <Tooltip content={<CustomTooltip dark={dark} />} />
                          <Line type="monotone" dataKey="savings" name="Savings" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3.5, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive animationDuration={1100} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                    <ViewDetailsBtn dark={dark} onClick={() => openPanel('chartSavings')} />
                  </div>
                </Stagger>

                {/* Category ranking */}
                <Stagger delay={660}>
                  <div className={`${cardClass} p-6`}>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>Category Ranking</h3>
                      <span className={dark ? 'text-gray-600' : 'text-gray-400'}><Icons.Chart /></span>
                    </div>
                    <p className={`text-xs mb-4 ${subtle}`}>Avg. {money(averageExpense)} per category</p>
                    {categoryData.length === 0 ? (
                      <p className={`text-sm text-center py-12 ${subtle}`}>No categories yet</p>
                    ) : (
                      <div className="space-y-3.5">
                        {categoryData.slice(0, 5).map((cat, i) => {
                          const width = expenses ? Math.max(6, Math.round((cat.value / expenses) * 100)) : 0
                          const CatIcon = getCategoryIcon(cat.name)
                          return (
                            <div
                              key={cat.name}
                              onClick={() => { setSelectedCategory(cat); setSelectedCategoryIndex(i); openPanel('category') }}
                              className={`cursor-pointer rounded-xl px-2.5 py-2 transition-colors ${dark ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50'}`}
                              style={{ opacity: 0, animation: `fadeIn 0.4s ease ${i * 70}ms forwards` }}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span style={{ color: COLORS[i % COLORS.length] }}><CatIcon /></span>
                                  <p className={`text-xs font-medium ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{cat.name}</p>
                                </div>
                                <p className={`text-xs ${subtle}`}>{money(cat.value)}</p>
                              </div>
                              <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${width}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </Stagger>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {panel === 'income'       && <IncomeModal       dark={dark} transactions={transactions} income={income} monthlyData={monthlyData} onClose={closePanel} />}
      {panel === 'expenses'     && <ExpensesModal     dark={dark} transactions={transactions} expenses={expenses} monthlyData={monthlyData} categoryData={categoryData} onClose={closePanel} />}
      {panel === 'savings'      && <NetSavingsModal   dark={dark} income={income} expenses={expenses} netSavings={netSavings} monthlyData={monthlyData} onClose={closePanel} />}
      {panel === 'savingsRate'  && <SavingsRateModal  dark={dark} savingsRate={savingsRate} income={income} onClose={closePanel} />}
      {panel === 'category'     && selectedCategory && <CategoryModal dark={dark} category={selectedCategory} transactions={transactions} totalExpenses={expenses} colorIndex={selectedCategoryIndex} onClose={closePanel} />}
      {panel === 'chartIncome'  && <IncomeExpensesModal  dark={dark} monthlyData={monthlyData} onClose={closePanel} />}
      {panel === 'chartSavings' && <SavingsTrendModal    dark={dark} monthlyData={monthlyData} onClose={closePanel} />}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </PageWrapper>
  )
}