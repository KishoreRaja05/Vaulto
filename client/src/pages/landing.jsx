import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import { useTheme } from '../context/ThemeContext'

// ─── PageWrapper & Stagger (same as Analytics) ────────────────────────────────
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

// ─── SVG Icons (same pattern as Analytics) ────────────────────────────────────
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  Transactions: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 5h12M3 9h8M3 13h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 11l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 13V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  Analytics: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M2 14L6 9l3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Lock: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3" y="8" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 8V6a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="9" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  ),
  Mobile: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="5" y="1.5" width="8" height="15" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="9" cy="14" r="0.75" fill="currentColor"/>
    </svg>
  ),
  Insight: () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M9 8v4M9 6v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Check: () => (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Income: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 11V3M7 3L4 6M7 3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Expense: () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 3v8M7 11l-3-3M7 11l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

// ─── Animated number (same as original) ──────────────────────────────────────
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

// ─── Feature data ─────────────────────────────────────────────────────────────
const features = [
  {
    Icon: Icons.Dashboard,
    title: 'Live dashboard',
    desc: 'Balance, income, expenses, and savings rate visible the moment you open the app. No digging, no setup.',
  },
  {
    Icon: Icons.Transactions,
    title: 'Transaction log',
    desc: 'Add income and expenses with a category, description, and date. Edit or delete anything at any time.',
  },
  {
    Icon: Icons.Analytics,
    title: 'Spending analytics',
    desc: 'Bar charts, pie charts, and a savings trend line that update live as you log. Drill into any category for a full breakdown.',
  },
  {
    Icon: Icons.Insight,
    title: 'Contextual insights',
    desc: 'Each chart surfaces a plain-language analysis — your best month, your highest category, whether your savings rate is on track.',
  },
  {
    Icon: Icons.Lock,
    title: 'Secure by default',
    desc: 'JWT authentication and bcrypt password hashing. Your financial data never leaves your own account.',
  },
  {
    Icon: Icons.Mobile,
    title: 'Works everywhere',
    desc: 'Fully responsive layout. The same clean experience on a 13" laptop or a 5" phone screen.',
  },
]

// ─── How it works ─────────────────────────────────────────────────────────────
const steps = [
  {
    step: '01',
    title: 'Create an account',
    desc: 'Sign up with an email and password. No credit card, no onboarding questionnaire.',
  },
  {
    step: '02',
    title: 'Log your transactions',
    desc: 'Add your income and expenses with categories. Takes about 30 seconds per entry.',
  },
  {
    step: '03',
    title: 'Read the insights',
    desc: 'Charts and analysis update immediately. The more you log, the sharper the picture.',
  },
]

// ─── What Vaulto actually tracks (replaces fake testimonials) ─────────────────
const trackingPoints = [
  {
    label: 'Income sources',
    detail: 'Salary, freelance, or any custom category. Every rupee in is recorded.',
  },
  {
    label: 'Expense categories',
    detail: 'Food, transport, bills, shopping, entertainment — with per-category breakdowns.',
  },
  {
    label: 'Monthly savings rate',
    detail: 'Your income minus expenses as a percentage. Benchmarked against the 20% target.',
  },
  {
    label: 'Trend over time',
    detail: 'Month-by-month savings line so you can see if your habits are improving.',
  },
  {
    label: 'Category ranking',
    detail: 'Your top spending categories ordered by value, with proportional progress bars.',
  },
  {
    label: 'Net savings',
    detail: 'Total income minus total expenses across your entire recorded history.',
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const { dark } = useTheme()
  const d = dark

  // card and text utilities — exactly matching Analytics
  const cardClass = `rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(99,102,241,0.10)] ${d ? 'bg-gray-900 border-gray-800 text-gray-100 hover:border-gray-700' : 'bg-white border-gray-200 text-gray-900 hover:border-indigo-100'}`
  const subtle = d ? 'text-gray-500' : 'text-gray-400'
  const muted  = d ? 'text-gray-400' : 'text-gray-500'

  return (
    <PageWrapper>
      <div className={`min-h-screen ${d ? 'bg-gray-950 text-white' : 'bg-gray-50/60 text-gray-900'} transition-colors duration-300`}>

        {/* ── Navbar ── same style as AppNav */}
        <nav
          className={`sticky top-0 z-50 border-b ${d ? 'border-gray-800' : 'border-gray-200'}`}
          style={{ backdropFilter: 'blur(12px)', backgroundColor: d ? 'rgba(3,7,18,0.92)' : 'rgba(249,250,251,0.92)' }}
        >
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <span className={`font-semibold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>Vaulto</span>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <Link
                  to="/login"
                  className={`text-xs font-medium px-4 py-1.5 rounded-lg border transition-colors ${d ? 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg transition-colors"
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left copy */}
            <div>
              <Stagger delay={50}>
                <div className={`inline-flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-full border mb-6 uppercase tracking-widest ${d ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Personal finance tracker
                </div>
              </Stagger>

              <Stagger delay={100}>
                <h1 className={`text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-[1.12] ${d ? 'text-white' : 'text-gray-900'}`}>
                  Know exactly where<br />your money goes
                </h1>
              </Stagger>

              <Stagger delay={175}>
                <p className={`text-base leading-relaxed mb-8 max-w-md ${muted}`}>
                  Vaulto is a personal finance tracker that turns your income and expenses into clear charts, savings signals, and category breakdowns — without the noise.
                </p>
              </Stagger>

              <Stagger delay={250}>
                <div className="flex flex-wrap items-center gap-3 mb-8">
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                  >
                    Start for free
                    <Icons.ArrowRight />
                  </Link>
                  <Link
                    to="/login"
                    className={`inline-flex items-center gap-2 font-medium px-5 py-2.5 rounded-xl border transition-colors text-sm ${d ? 'border-gray-700 text-gray-300 hover:border-gray-600 hover:text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'}`}
                  >
                    Log in
                  </Link>
                </div>

                {/* Honest value props */}
                <div className="flex flex-col gap-2">
                  {['No credit card required', 'No ads, no upsells', 'Built as an open portfolio project'].map((item) => (
                    <div key={item} className="flex items-center gap-2">
                      <span className="text-emerald-500"><Icons.Check /></span>
                      <span className={`text-xs ${muted}`}>{item}</span>
                    </div>
                  ))}
                </div>
              </Stagger>
            </div>

            {/* Right — dashboard preview matching actual Analytics card style */}
            <Stagger delay={325}>
              <div className={`rounded-2xl border overflow-hidden shadow-[0_24px_48px_rgba(15,23,42,0.12)] ${d ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>

                {/* Mock top bar matching Analytics page header */}
                <div className={`px-5 pt-5 pb-4 border-b ${d ? 'border-gray-800' : 'border-gray-100'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1 ${subtle}`}>Financial analytics</p>
                  <p className={`text-base font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>Overview</p>
                </div>

                <div className="p-5">
                  {/* 4 summary cards matching Analytics summaryCards */}
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    {[
                      { label: 'Total Income',   value: 85000, prefix: '₹', color: 'text-emerald-600' },
                      { label: 'Total Expenses',  value: 56000, prefix: '₹', color: 'text-red-500'     },
                      { label: 'Net Savings',     value: 29000, prefix: '₹', color: 'text-indigo-500'  },
                      { label: 'Savings Rate',    value: 34,    suffix: '%', color: 'text-emerald-600' },
                    ].map((s, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-3 ${d ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-100'}`}
                        style={{ opacity: 0, animation: `fadeIn 0.4s ease ${200 + i * 60}ms forwards` }}
                      >
                        <p className={`text-[10px] font-medium mb-1.5 ${subtle}`}>{s.label}</p>
                        <p className={`text-base font-bold ${s.color}`}>
                          <AnimatedNumber value={s.value} prefix={s.prefix || ''} suffix={s.suffix || ''} />
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Insight strip — same 3-dot pattern as Analytics */}
                  <div className="space-y-2 mb-4">
                    {[
                      { dot: 'bg-amber-500', text: 'Bills leads expenses at ₹18,000 — 32% of total.' },
                      { dot: 'bg-emerald-500', text: 'Savings rate of 34% is above the 20% benchmark.' },
                    ].map((ins, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border px-3 py-2.5 flex items-start gap-2 ${d ? 'bg-gray-800/40 border-gray-700/60 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}
                        style={{ opacity: 0, animation: `fadeIn 0.4s ease ${500 + i * 80}ms forwards` }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${ins.dot}`} />
                        <p className="text-[11px] leading-relaxed">{ins.text}</p>
                      </div>
                    ))}
                  </div>

                  {/* Mini category ranking — same bar style as Analytics */}
                  <div className={`rounded-xl border p-3 ${d ? 'border-gray-700/60' : 'border-gray-100'}`}>
                    <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${subtle}`}>Category Ranking</p>
                    {[
                      { name: 'Bills',          pct: 32, color: '#6366f1' },
                      { name: 'Food',           pct: 24, color: '#0ea5e9' },
                      { name: 'Shopping',       pct: 20, color: '#10b981' },
                      { name: 'Transport',      pct: 14, color: '#f59e0b' },
                    ].map((cat, i) => (
                      <div
                        key={cat.name}
                        className="mb-2.5 last:mb-0"
                        style={{ opacity: 0, animation: `fadeIn 0.4s ease ${700 + i * 60}ms forwards` }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-[11px] font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>{cat.name}</p>
                          <p className={`text-[10px] ${subtle}`}>{cat.pct}%</p>
                        </div>
                        <div className={`h-1.5 rounded-full ${d ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className="h-1.5 rounded-full" style={{ width: `${cat.pct}%`, backgroundColor: cat.color, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Stagger>
          </div>
        </section>

        {/* ── What Vaulto tracks (replaces fake stats bar) ── */}
        <Stagger delay={100}>
          <section className={`border-y ${d ? 'border-gray-800 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
            <div className="max-w-6xl mx-auto px-6 py-10">
              <p className={`text-[11px] font-semibold uppercase tracking-widest mb-6 ${subtle}`}>What Vaulto tracks</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                {trackingPoints.map((point, i) => (
                  <div key={i} style={{ opacity: 0, animation: `fadeIn 0.4s ease ${i * 60}ms forwards` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-emerald-500"><Icons.Check /></span>
                      <p className={`text-xs font-semibold ${d ? 'text-gray-200' : 'text-gray-800'}`}>{point.label}</p>
                    </div>
                    <p className={`text-xs leading-relaxed pl-5 ${muted}`}>{point.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Stagger>

        {/* ── Features ── */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <Stagger delay={50}>
            <div className="mb-10">
              <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${subtle}`}>Features</p>
              <h2 className={`text-2xl font-bold tracking-tight ${d ? 'text-white' : 'text-gray-900'}`}>Built for clarity, not complexity</h2>
              <p className={`text-sm mt-2 max-w-md ${muted}`}>Every screen in Vaulto is designed around one question: what do you actually need to know about your money right now?</p>
            </div>
          </Stagger>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={i}
                className={`${cardClass} p-5`}
                style={{ opacity: 0, animation: `fadeIn 0.4s ease ${i * 70}ms forwards` }}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-4 ${d ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  <f.Icon />
                </div>
                <h3 className={`font-semibold text-sm mb-1.5 ${d ? 'text-white' : 'text-gray-900'}`}>{f.title}</h3>
                <p className={`text-xs leading-relaxed ${muted}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section className={`border-y ${d ? 'border-gray-800 bg-gray-900/40' : 'border-gray-200 bg-white'}`}>
          <div className="max-w-6xl mx-auto px-6 py-20">
            <Stagger delay={50}>
              <div className="mb-10">
                <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${subtle}`}>Getting started</p>
                <h2 className={`text-2xl font-bold tracking-tight ${d ? 'text-white' : 'text-gray-900'}`}>Up and running in under a minute</h2>
                <p className={`text-sm mt-2 max-w-md ${muted}`}>No configuration, no import steps, no linking a bank account. Just sign up and start logging.</p>
              </div>
            </Stagger>

            <div className="grid md:grid-cols-3 gap-6">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className={`${cardClass} p-5`}
                  style={{ opacity: 0, animation: `fadeIn 0.4s ease ${100 + i * 80}ms forwards` }}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-4 text-xs font-bold ${d ? 'bg-indigo-900/40 text-indigo-300 border border-indigo-800/60' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                    {s.step}
                  </div>
                  <h3 className={`font-semibold text-sm mb-1.5 ${d ? 'text-white' : 'text-gray-900'}`}>{s.title}</h3>
                  <p className={`text-xs leading-relaxed ${muted}`}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why this exists (honest "about" replacing testimonials) ── */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <Stagger delay={50}>
            <div className="mb-10">
              <p className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${subtle}`}>About</p>
              <h2 className={`text-2xl font-bold tracking-tight ${d ? 'text-white' : 'text-gray-900'}`}>Why Vaulto was built</h2>
            </div>
          </Stagger>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Main about card */}
            <div className={`${cardClass} p-6 lg:col-span-2`}>
              <p className={`text-sm leading-relaxed mb-4 ${d ? 'text-gray-300' : 'text-gray-600'}`}>
                Most personal finance tools are either too simple — a basic spreadsheet with no visual feedback — or too complex, demanding bank integrations, budget categories, and weekly check-ins before you see anything useful.
              </p>
              <p className={`text-sm leading-relaxed mb-4 ${d ? 'text-gray-300' : 'text-gray-600'}`}>
                Vaulto sits in between. You log what you earn and what you spend. In return, you get a clear dashboard, category charts, a savings trend line, and plain-language analysis of what the numbers mean. No bank linking, no automations, no subscription.
              </p>
              <p className={`text-sm leading-relaxed ${d ? 'text-gray-300' : 'text-gray-600'}`}>
                It was built as a full-stack portfolio project using React, Node.js, and PostgreSQL — the kind of app you'd actually use, not just demo.
              </p>
            </div>

            {/* Tech stack */}
            <div className={`${cardClass} p-5`}>
              <p className={`text-[11px] font-semibold uppercase tracking-widest mb-4 ${subtle}`}>Tech stack</p>
              <div className="space-y-3">
                {[
                  { layer: 'Frontend',  detail: 'React, React Router, Recharts, Tailwind CSS' },
                  { layer: 'Backend',   detail: 'Node.js, Express, REST API' },
                  { layer: 'Database',  detail: 'PostgreSQL with parameterised queries' },
                  { layer: 'Auth',      detail: 'JWT tokens, bcrypt password hashing' },
                ].map((t, i) => (
                  <div key={i} className={`flex items-start gap-3 py-2.5 border-b last:border-0 ${d ? 'border-gray-800' : 'border-gray-100'}`}>
                    <p className={`text-xs font-semibold w-20 flex-shrink-0 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{t.layer}</p>
                    <p className={`text-xs ${muted}`}>{t.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* What it is not */}
            <div className={`${cardClass} p-5`}>
              <p className={`text-[11px] font-semibold uppercase tracking-widest mb-4 ${subtle}`}>What Vaulto is not</p>
              <div className="space-y-3">
                {[
                  'A real bank or financial institution',
                  'Connected to your actual accounts',
                  'A budgeting or goal-setting tool',
                  'A substitute for professional financial advice',
                ].map((item, i) => (
                  <div key={i} className={`flex items-start gap-2.5 py-2 border-b last:border-0 ${d ? 'border-gray-800' : 'border-gray-100'}`}>
                    <span className={`text-xs mt-0.5 flex-shrink-0 ${d ? 'text-gray-600' : 'text-gray-300'}`}>—</span>
                    <p className={`text-xs leading-relaxed ${muted}`}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── matches Analytics card style, no gradient blob tricks */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <Stagger delay={50}>
            <div className={`rounded-2xl border px-8 py-14 text-center ${d ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-widest mb-3 ${subtle}`}>Get started</p>
              <h2 className={`text-2xl font-bold tracking-tight mb-3 ${d ? 'text-white' : 'text-gray-900'}`}>Start tracking your finances today</h2>
              <p className={`text-sm mb-8 max-w-sm mx-auto ${muted}`}>Free, no credit card, no setup. Just an account and your first transaction.</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Create your account
                  <Icons.ArrowRight />
                </Link>
                <Link
                  to="/login"
                  className={`inline-flex items-center gap-2 font-medium px-5 py-2.5 rounded-xl border transition-colors text-sm ${d ? 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                >
                  Log in
                </Link>
              </div>
            </div>
          </Stagger>
        </section>

        {/* ── Footer ── */}
        <footer className={`border-t ${d ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <span className={`font-semibold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>Vaulto</span>
              </div>
              <p className={`text-xs ${subtle}`}>Portfolio project — not a real financial service.</p>
              <div className="flex items-center gap-4">
                <Link to="/login"  className={`text-xs transition-colors ${d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>Log in</Link>
                <Link to="/signup" className={`text-xs transition-colors ${d ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>Sign up</Link>
              </div>
            </div>
          </div>
        </footer>

      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </PageWrapper>
  )
}