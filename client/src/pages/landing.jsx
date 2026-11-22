import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import PageContainer from '../components/PageContainer'
import PageWrapper from '../components/PageWrapper'
import { CountUp, Reveal } from '../components/Motion'
import Icon from '../components/ui/Icon'
import { useInView, useReducedMotion } from '../utils/useMotion'

const FEATURES = [
  { icon: 'wallet', title: 'One clear overview', text: 'Balance, income, expenses and savings rate on a single dashboard, updated as you add entries.' },
  { icon: 'table', title: 'Transactions you can search', text: 'Filter by type, category and date range, sort by amount, and edit or delete in one tap.' },
  { icon: 'trendUp', title: 'Analytics that explain', text: 'Monthly trends, category breakdowns and savings signals, with a detail view behind every chart.' },
  { icon: 'chat', title: 'An assistant that adds for you', text: 'Type "add 450 for dinner" and it is recorded. Ask whether you will overspend and get a forecast.' },
  { icon: 'upload', title: 'Import and export', text: 'Bring in CSV, Excel or statement PDFs with column mapping and validation. Export to CSV, Excel or a PDF report.' },
  { icon: 'info', title: 'Your data stays yours', text: 'Sign-in protected, per-user data, custom categories and a dark mode that follows your preference.' },
]

const STEPS = [
  { n: '01', title: 'Add or import', text: 'Log a transaction in seconds, or drop in a bank CSV and map the columns once.' },
  { n: '02', title: 'See where it goes', text: 'Categories, trends and a savings rate show up automatically. No setup, no linked accounts.' },
  { n: '03', title: 'Ask and adjust', text: 'Ask the assistant about a month, spot what changed, and tune your spending.' },
]

const FACTS = [[3, 'export formats'], [5, 'import file types'], [7, 'default categories'], [1, 'assistant on every page']]
const CHIPS = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Salary', 'Freelance', 'CSV import', 'Excel export', 'PDF reports', 'Dark mode', 'Custom categories', 'AI assistant', 'Analytics']

const FOOTER_GROUPS = [
  { title: 'Product', links: [['Features', '#features'], ['AI assistant', '#assistant'], ['How it works', '#how']] },
  { title: 'Account', links: [['Create an account', '/signup'], ['Log in', '/login']] },
  { title: 'Built with', links: [['React and Vite', null], ['Node and Express', null], ['FastAPI', null]] },
]

const HEADLINE = [['Know'], ['exactly'], ['where'], ['your', true], ['money', true], ['goes.', true]]

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600"><span className="text-xs font-bold text-white">V</span></span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">Vaulto</span>
    </div>
  )
}

// Transparent at the top, blurred + bordered after 20px; thin progress bar underneath.
function ScrollNav() {
  const { token } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const bar = useRef(null)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const y = window.scrollY
      setScrolled((prev) => (prev === y > 20 ? prev : y > 20))
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [])

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${scrolled ? 'border-gray-200 backdrop-blur-md dark:border-gray-800' : 'border-transparent'}`}
      style={{ backgroundColor: scrolled ? 'color-mix(in srgb, var(--vl-surface) 85%, transparent)' : 'transparent' }}
    >
      <PageContainer>
        <div className="flex h-14 items-center justify-between">
          <Logo />
          <div className="hidden items-center gap-6 md:flex">
            {[['Features', '#features'], ['Assistant', '#assistant'], ['How it works', '#how']].map(([label, href]) => (
              <a key={href} href={href} className="vl-focus rounded text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">{label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {token ? (
              <Link to="/dashboard" className="vl-focus rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700">Go to dashboard</Link>
            ) : (
              <>
                <Link to="/login" className="vl-focus rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-indigo-300 dark:border-gray-700 dark:text-gray-300">Log in</Link>
                <Link to="/signup" className="vl-focus rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700">Get started</Link>
              </>
            )}
          </div>
        </div>
      </PageContainer>
      <div ref={bar} aria-hidden="true" className="absolute inset-x-0 bottom-[-1px] h-[2px] origin-left bg-indigo-600" style={{ transform: 'scaleX(0)' }} />
    </nav>
  )
}

function DashboardMock() {
  const bars = [[46, 30], [58, 34], [40, 28], [64, 36], [52, 31], [70, 33]]
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov']
  return (
    <div className="relative mx-auto w-full max-w-[560px]" aria-hidden="true">
      <div className="vl-card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Total balance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white"><CountUp prefix="Rs. " value={124380} /></p>
          </div>
          <svg viewBox="0 0 100 32" className="h-8 w-24 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path pathLength="1" className="vl-draw" d="M2 26 L18 20 L32 23 L48 12 L63 16 L80 6 L98 9" />
          </svg>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-[11px] text-gray-400">Income</p>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400"><CountUp prefix="Rs. " value={72000} /></p>
          </div>
          <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
            <p className="text-[11px] text-gray-400">Expenses</p>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400"><CountUp prefix="Rs. " value={37620} /></p>
          </div>
        </div>
        <div className="flex h-32 items-end justify-between gap-3 border-b border-gray-100 px-1 dark:border-gray-800">
          {bars.map(([inc, exp], i) => (
            <div key={months[i]} className="flex h-full flex-1 items-end justify-center gap-1">
              <span className="vl-grow w-2.5 rounded-t bg-emerald-500" style={{ height: `${inc}%`, animationDelay: `${0.3 + i * 0.1}s` }} />
              <span className="vl-grow w-2.5 rounded-t bg-red-500" style={{ height: `${exp}%`, animationDelay: `${0.4 + i * 0.1}s` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between px-1 text-[10px] text-gray-400">{months.map((m) => <span key={m} className="flex-1 text-center">{m}</span>)}</div>
      </div>

      <div className="vl-bob vl-panel absolute -right-2 -top-6 hidden w-40 p-3 sm:block lg:-right-10" style={{ animationDuration: '5.5s' }}>
        <p className="text-[11px] text-gray-400">Savings</p>
        <p className="flex items-center gap-1 text-lg font-bold text-emerald-600 dark:text-emerald-400"><Icon name="trendUp" size={16} /> +12%</p>
      </div>
      <div className="vl-bob vl-panel absolute -left-2 top-1/2 hidden w-44 p-3 sm:block lg:-left-12" style={{ animationDuration: '7s', animationDelay: '-2s' }}>
        <p className="text-[11px] text-gray-400">Food spending</p>
        <p className="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white"><Icon name="trendDown" size={15} className="text-emerald-600 dark:text-emerald-400" /> down 8%</p>
      </div>
      <div className="vl-bob vl-panel absolute -bottom-8 right-6 hidden w-56 p-3 sm:block" style={{ animationDuration: '6.2s', animationDelay: '-4s' }}>
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"><Icon name="check" size={14} strokeWidth={2} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 dark:text-white">Transaction added</p>
            <p className="text-[11px] text-gray-400">Swiggy dinner, -Rs. 450</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const REPLY = 'Done. I added a Food expense of Rs. 450 for today.'

// Auto-plays while on screen: user message, typing, streamed reply, confirmation chip, pause, loop.
function ChatDemo() {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const active = useInView(ref, { once: false, threshold: 0.4 })
  const [phase, setPhase] = useState(0) // 0 empty, 1 user, 2 typing, 3 streaming, 4 chip
  const [chars, setChars] = useState(0)
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (!active || reduced) return undefined
    const timers = []
    let stream
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))
    at(0, () => { setPhase(0); setChars(0) })
    at(400, () => setPhase(1))
    at(1300, () => setPhase(2))
    at(2500, () => {
      setPhase(3)
      let i = 0
      stream = setInterval(() => {
        i += 1
        setChars(i)
        if (i >= REPLY.length) clearInterval(stream)
      }, 28)
    })
    at(2500 + REPLY.length * 28 + 400, () => setPhase(4))
    at(2500 + REPLY.length * 28 + 4200, () => setCycle((c) => c + 1))
    return () => { timers.forEach(clearTimeout); clearInterval(stream) }
  }, [active, reduced, cycle])

  const p = reduced ? 4 : phase
  const text = reduced ? REPLY : REPLY.slice(0, chars)

  return (
    <div ref={ref} className="vl-card mx-auto w-full max-w-[460px] overflow-hidden" aria-hidden="true">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white"><Icon name="sparkle" size={14} /></span>
        <div>
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Assistant</p>
          <p className="text-[10px] text-gray-400">Example conversation</p>
        </div>
      </div>
      <div className="flex min-h-[250px] flex-col justify-end space-y-3 p-4">
        {p >= 1 && <div className="vl-popin flex justify-end"><div className="rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2 text-sm text-white">Add 450 for dinner today</div></div>}
        {p === 2 && (
          <div className="vl-popin vl-muted-bg flex w-fit items-center gap-1 rounded-2xl rounded-bl-md px-3.5 py-3">
            {[0, 1, 2].map((i) => <span key={i} className="vl-dot h-1.5 w-1.5 rounded-full bg-gray-400" style={{ animationDelay: `${i * 0.18}s` }} />)}
          </div>
        )}
        {p >= 3 && <div className="vl-muted-bg max-w-[90%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm text-gray-800 dark:text-gray-100">{text}</div>}
        {p >= 4 && (
          <div className="vl-popin vl-card flex max-w-[90%] items-center gap-3 p-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"><Icon name="check" size={13} strokeWidth={2} /></span>
            <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-medium text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300">Food</span>
            <span className="flex-1 text-xs text-gray-500">Transaction added</span>
            <span className="tabular text-xs font-semibold text-red-600 dark:text-red-400">-Rs. 450</span>
          </div>
        )}
      </div>
    </div>
  )
}

// Connector line draws with scroll; each step lights up as the line reaches it.
function Steps() {
  const wrap = useRef(null)
  const reduced = useReducedMotion()
  const [activeStep, setActiveStep] = useState(reduced ? STEPS.length : 0)

  useEffect(() => {
    if (reduced) return undefined
    let raf = 0
    const update = () => {
      raf = 0
      const el = wrap.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const p = Math.max(0, Math.min(1, (window.innerHeight * 0.75 - r.top) / r.height))
      el.style.setProperty('--p', p.toFixed(3))
      const count = Math.min(STEPS.length, Math.floor(p * (STEPS.length + 0.4)) )
      setActiveStep((prev) => (prev === count ? prev : count))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [reduced])

  return (
    <div ref={wrap} className="relative grid gap-4 md:grid-cols-3" style={{ '--p': reduced ? 1 : 0 }}>
      {/* connector: vertical on mobile, horizontal on md+ */}
      <span aria-hidden="true" className="absolute bottom-6 left-[27px] top-6 w-px bg-gray-200 dark:bg-gray-800 md:hidden" />
      <span aria-hidden="true" className="absolute bottom-6 left-[27px] top-6 w-px origin-top bg-indigo-600 md:hidden" style={{ transform: 'scaleY(var(--p))' }} />
      <span aria-hidden="true" className="absolute left-[27px] right-[27px] top-[27px] hidden h-px bg-gray-200 dark:bg-gray-800 md:block" />
      <span aria-hidden="true" className="absolute left-[27px] right-[27px] top-[27px] hidden h-px origin-left bg-indigo-600 md:block" style={{ transform: 'scaleX(var(--p))' }} />
      {STEPS.map((s, i) => {
        const on = i < activeStep
        return (
          <div key={s.n} className="relative flex gap-4 md:block">
            <span className={`vl-step-dot relative z-10 flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${on ? 'scale-105 border-indigo-600 bg-indigo-600 text-white' : 'border-gray-300 text-gray-400 dark:border-gray-700'}`} style={{ background: on ? undefined : 'var(--vl-surface)' }}>{s.n}</span>
            <div className="vl-card vl-card-hover flex-1 p-6 md:mt-5">
              <h3 className="mb-1.5 text-base font-semibold">{s.title}</h3>
              <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{s.text}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Primary CTA that drifts a few px toward the cursor (desktop, motion allowed).
function MagneticLink({ to, className, children }) {
  const ref = useRef(null)
  const reduced = useReducedMotion()
  const onMove = (e) => {
    if (reduced || !window.matchMedia('(pointer: fine)').matches) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - (r.left + r.width / 2)) * 0.18
    const y = (e.clientY - (r.top + r.height / 2)) * 0.28
    ref.current.style.transform = `translate(${x}px, ${y}px)`
  }
  const reset = () => { if (ref.current) ref.current.style.transform = '' }
  return (
    <span className="vl-glow inline-block rounded-[10px]" onMouseMove={onMove} onMouseLeave={reset}>
      <Link ref={ref} to={to} className={className} style={{ transition: 'transform 0.2s ease-out' }}>{children}</Link>
    </span>
  )
}

export default function Landing() {
  const { token } = useAuth()
  const heroRef = useRef(null)
  const tiltRef = useRef(null)
  const reduced = useReducedMotion()

  // Subtle 3D tilt toward the cursor; desktop with a fine pointer only.
  useEffect(() => {
    const hero = heroRef.current
    if (!hero || reduced) return undefined
    const fine = window.matchMedia('(min-width: 1024px) and (pointer: fine)')
    let raf = 0
    const onMove = (e) => {
      if (!fine.matches || raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = tiltRef.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth
        const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight
        el.style.setProperty('--ry', `${(dx * 10).toFixed(2)}deg`)
        el.style.setProperty('--rx', `${(-dy * 8).toFixed(2)}deg`)
      })
    }
    const onLeave = () => { tiltRef.current?.style.setProperty('--ry', '0deg'); tiltRef.current?.style.setProperty('--rx', '0deg') }
    hero.addEventListener('mousemove', onMove)
    hero.addEventListener('mouseleave', onLeave)
    return () => { hero.removeEventListener('mousemove', onMove); hero.removeEventListener('mouseleave', onLeave); cancelAnimationFrame(raf) }
  }, [reduced])

  const primary = 'inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-indigo-600 px-6 text-sm font-medium text-white transition-colors hover:bg-indigo-700 vl-focus'
  const secondary = 'inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-gray-300 px-6 text-sm font-medium text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-indigo-500 vl-focus'
  const eyebrow = 'mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400'
  const chipRow = [...CHIPS, ...CHIPS]

  return (
    <PageWrapper>
      <div className="min-h-screen overflow-x-clip bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-gray-950 dark:text-white">
        <ScrollNav />

        {/* Hero */}
        <section ref={heroRef} className="relative">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <span className="vl-blob vl-blob-a -left-24 -top-16 h-[420px] w-[420px] bg-indigo-400" />
            <span className="vl-blob vl-blob-b -right-24 top-20 h-[380px] w-[380px] bg-emerald-400" />
          </div>
          <PageContainer className="relative pb-20 pt-12 lg:pb-28 lg:pt-20">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <div>
                <Reveal>
                  <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Personal finance tracker
                  </p>
                </Reveal>
                <h1 className="mb-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl" aria-label="Know exactly where your money goes.">
                  {HEADLINE.map(([word, accent], i) => (
                    <span key={word} aria-hidden="true" className={`vl-word mr-[0.25em] ${accent ? 'text-indigo-600 dark:text-indigo-400' : ''}`} style={{ animationDelay: `${120 + i * 90}ms` }}>{word}</span>
                  ))}
                </h1>
                <Reveal delay={750}>
                  <p className="mb-8 max-w-lg text-base leading-relaxed text-gray-500 dark:text-gray-400 sm:text-lg">
                    Vaulto tracks income and expenses, explains your spending with clear analytics, and lets you add or question your data in plain language.
                  </p>
                </Reveal>
                <Reveal delay={900}>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {token ? (
                      <Link to="/dashboard" className={primary}>Go to dashboard <Icon name="chevronRight" size={16} /></Link>
                    ) : (
                      <Link to="/signup" className={primary}>Get started free <Icon name="chevronRight" size={16} /></Link>
                    )}
                    <a href="#how" className={secondary}>See how it works</a>
                  </div>
                  <p className="mt-4 text-xs text-gray-400">Free to use. No bank linking, no credit card.</p>
                </Reveal>
              </div>
              <Reveal delay={300} direction="none">
                <div ref={tiltRef} className="vl-tilt"><DashboardMock /></div>
              </Reveal>
            </div>
          </PageContainer>
        </section>

        {/* Facts + marquee */}
        <section className="border-y border-gray-200 dark:border-gray-800" style={{ background: 'var(--vl-surface)' }}>
          <PageContainer className="py-10">
            <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">Built to track</p>
            <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {FACTS.map(([n, label]) => (
                <div key={label} className="text-center">
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-3xl font-bold text-gray-900 dark:text-white"><CountUp value={n} /></dd>
                  <p className="mt-1 text-sm text-gray-500">{label}</p>
                </div>
              ))}
            </dl>
          </PageContainer>
          <div className="vl-marquee overflow-hidden border-t border-gray-200 py-4 dark:border-gray-800" aria-hidden="true">
            <div className="vl-marquee-track gap-3 pr-3">
              {chipRow.map((c, i) => (
                <span key={`${c}-${i}`} className="shrink-0 rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:text-gray-300">{c}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-16">
          <PageContainer className="py-20 lg:py-24">
            <Reveal className="mb-12 max-w-2xl">
              <p className={eyebrow}>Features</p>
              <h2 className="text-3xl font-bold tracking-tight">Everything you need to understand your money</h2>
              <p className="mt-3 text-gray-500 dark:text-gray-400">Every screen is built around one question: what do you need to know about your money right now?</p>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 80} className="h-full">
                  <div className="vl-card vl-card-hover vl-sweep h-full p-6">
                    <span className="vl-sweep-icon mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon name={f.icon} size={20} /></span>
                    <h3 className="mb-1.5 text-sm font-semibold">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{f.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </PageContainer>
        </section>

        {/* Assistant */}
        <section id="assistant" className="scroll-mt-16 border-y border-gray-200 dark:border-gray-800" style={{ background: 'var(--vl-surface)' }}>
          <PageContainer className="py-20 lg:py-24">
            <div className="grid items-center gap-14 lg:grid-cols-2">
              <Reveal direction="right">
                <p className={eyebrow}>AI assistant</p>
                <h2 className="text-3xl font-bold tracking-tight">Talk to your finances</h2>
                <p className="mt-3 max-w-lg text-gray-500 dark:text-gray-400">
                  The assistant lives on every page and knows which screen you are looking at. Add a transaction in a sentence, ask for a summary, or check whether this month is going off track.
                </p>
                <ul className="mt-6 space-y-3">
                  {['Add expenses and income in plain language', 'Ask about categories, months and forecasts', 'Suggestions that change with the page you are on'].map((t) => (
                    <li key={t} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <Icon name="check" size={16} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-400" /> {t}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal direction="left" delay={100}><ChatDemo /></Reveal>
            </div>
          </PageContainer>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16">
          <PageContainer className="py-20 lg:py-24">
            <Reveal className="mb-12 max-w-2xl">
              <p className={eyebrow}>How it works</p>
              <h2 className="text-3xl font-bold tracking-tight">From first entry to clear picture in three steps</h2>
            </Reveal>
            <Steps />
          </PageContainer>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden border-t border-gray-200 dark:border-gray-800" style={{ background: 'var(--vl-surface)' }}>
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <span className="vl-blob vl-blob-a left-1/4 top-0 h-[320px] w-[320px] bg-indigo-400" />
            <span className="vl-blob vl-blob-b right-1/4 -top-10 h-[300px] w-[300px] bg-emerald-400" />
          </div>
          <PageContainer className="relative py-24 text-center">
            <Reveal>
              <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight">Start with your first transaction</h2>
              <p className="mx-auto mb-8 mt-3 max-w-md text-gray-500 dark:text-gray-400">Free, no credit card, no setup. Just an account and an entry.</p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                {token ? (
                  <Link to="/dashboard" className={primary}>Go to dashboard</Link>
                ) : (
                  <>
                    <MagneticLink to="/signup" className={primary}>Create your account</MagneticLink>
                    <Link to="/login" className={secondary}>Log in</Link>
                  </>
                )}
              </div>
            </Reveal>
          </PageContainer>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-800">
          <PageContainer className="py-12">
            <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
              <div>
                <Logo />
                <p className="mt-3 max-w-xs text-sm text-gray-500 dark:text-gray-400">A personal finance tracker with analytics and an assistant that understands your data.</p>
              </div>
              {FOOTER_GROUPS.map((g) => (
                <div key={g.title}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">{g.title}</p>
                  <ul className="space-y-2">
                    {g.links.map(([label, href]) => (
                      <li key={label}>
                        {!href ? <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                          : href.startsWith('#') ? <a href={href} className="vl-focus rounded text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">{label}</a>
                            : <Link to={href} className="vl-focus rounded text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">{label}</Link>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-col justify-between gap-2 border-t border-gray-200 pt-6 text-xs text-gray-400 dark:border-gray-800 sm:flex-row">
              <p>&copy; {new Date().getFullYear()} Vaulto. All rights reserved.</p>
              <p>Vaulto is a personal finance tracking tool, not a bank or financial advisor.</p>
            </div>
          </PageContainer>
        </footer>
      </div>
    </PageWrapper>
  )
}
