import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useRegisterPageContext } from '../context/PageContext'
import api from '../services/api'
import AppNav from '../components/AppNav'
import PageContainer from '../components/PageContainer'
import PageWrapper from '../components/PageWrapper'
import { AnimatedNumber, Stagger } from '../components/Motion'
import Button from '../components/ui/Button'
import Icon from '../components/ui/Icon'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'
import SegmentedControl from '../components/ui/SegmentedControl'
import Select from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { useToast } from '../components/ui/Toast'
import { exportToCSV, exportToExcel, exportToPDF, getAppliedFilterMeta } from '../utils/exportTransactions'

const SECTIONS = [
  { id: 'personal', label: 'Personal info', icon: 'wallet' },
  { id: 'security', label: 'Security', icon: 'info' },
  { id: 'preferences', label: 'Preferences', icon: 'sparkle' },
  { id: 'data', label: 'Your data', icon: 'download' },
  { id: 'account', label: 'Account', icon: 'x' },
]

const EXPORT_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'pdf', label: 'PDF report' },
]

// 0-4 score from length and character variety.
const passwordScore = (pw) => {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 6) score += 1
  if (pw.length >= 10) score += 1
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1
  return score
}
const STRENGTH = [
  { label: 'Too short', bar: 'bg-red-500' },
  { label: 'Weak', bar: 'bg-red-500' },
  { label: 'Fair', bar: 'bg-amber-500' },
  { label: 'Good', bar: 'bg-emerald-500' },
  { label: 'Strong', bar: 'bg-emerald-500' },
]

function Section({ id, title, description, children, tone }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`vl-card vl-card-hover scroll-mt-20 p-6 sm:p-8 ${tone === 'danger' ? 'border-red-200 dark:border-red-500/30' : ''}`}>
      <h2 id={`${id}-title`} className={`text-base font-semibold ${tone === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{title}</h2>
      <p className="mb-6 mt-1 text-sm text-gray-500">{description}</p>
      {children}
    </section>
  )
}

function PasswordField({ label, value, onChange, error, autoComplete }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input label={label} type={show ? 'text' : 'password'} value={value} onChange={onChange} error={error} autoComplete={autoComplete} className="pr-14" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-pressed={show}
        aria-label={`${show ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
        className="vl-focus absolute right-1 top-[26px] flex h-10 w-12 items-center justify-center rounded-lg text-[11px] font-medium text-gray-400 hover:text-gray-600"
      >
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export default function Profile() {
  const { user, login: updateUser, logout } = useAuth()
  const { dark, toggleDark } = useTheme()
  const navigate = useNavigate()
  const toast = useToast()
  useRegisterPageContext({ page: 'profile', sections: SECTIONS.map((s) => s.label) })

  const [active, setActive] = useState('personal')
  const [transactions, setTransactions] = useState(null)

  const [name, setName] = useState(user?.name || '')
  const [nameError, setNameError] = useState('')
  const [nameLoading, setNameLoading] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const [exportFormat, setExportFormat] = useState('csv')
  const [exporting, setExporting] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => {
    let alive = true
    api.get('/transactions')
      .then((r) => { if (alive) setTransactions(Array.isArray(r.data) ? r.data : []) })
      .catch(() => { if (alive) setTransactions([]) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean)
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (hit) setActive(hit.target.id)
    }, { rootMargin: '-20% 0px -60% 0px' })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const stats = useMemo(() => {
    if (!transactions) return null
    const now = new Date()
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const net = transactions
      .filter((t) => String(t.date || '').slice(0, 7) === key)
      .reduce((sum, t) => sum + (t.type === 'income' ? 1 : -1) * Number(t.amount), 0)
    return { total: transactions.length, net: Math.round(net) }
  }, [transactions])

  const nameDirty = name.trim() !== (user?.name || '') && name.trim().length > 0

  const saveName = async (e) => {
    e.preventDefault()
    const value = name.trim()
    if (!value) return setNameError('Name cannot be empty')
    if (value.length > 60) return setNameError('Name must be 60 characters or fewer')
    setNameLoading(true)
    setNameError('')
    try {
      const res = await api.put('/auth/update-name', { name: value })
      updateUser(localStorage.getItem('token'), res.data.user)
      setName(res.data.user?.name || value)
      toast.success('Name updated.')
    } catch (err) {
      setNameError(err.response?.data?.message || 'Could not update your name. Try again.')
    } finally {
      setNameLoading(false)
    }
  }

  const score = passwordScore(newPassword)
  const mismatch = confirmPassword && newPassword !== confirmPassword
  const pwReady = currentPassword && newPassword.length >= 6 && newPassword === confirmPassword

  const savePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) return setPwError('Passwords do not match')
    if (newPassword.length < 6) return setPwError('Password must be at least 6 characters')
    setPwLoading(true)
    setPwError('')
    try {
      await api.put('/auth/update-password', { currentPassword, newPassword })
      toast.success('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwError(err.response?.data?.message || 'Could not update your password. Check the current one.')
    } finally {
      setPwLoading(false)
    }
  }

  const exportData = async () => {
    if (!transactions?.length || exporting) return
    setExporting(true)
    try {
      const meta = getAppliedFilterMeta({ totalCount: transactions.length, filteredCount: transactions.length })
      if (exportFormat === 'csv') exportToCSV(transactions, meta)
      else if (exportFormat === 'xlsx') await exportToExcel(transactions, meta)
      else exportToPDF(transactions, meta)
      toast.success(`Exported ${transactions.length} transactions.`)
    } catch (err) {
      console.error(err)
      toast.error('Could not generate the export.')
    } finally {
      setExporting(false)
    }
  }

  const goTo = (id) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const initial = (user?.name || '?')[0].toUpperCase()
  const money = (n) => `${n < 0 ? '-' : n > 0 ? '+' : ''}Rs. ${Math.abs(n).toLocaleString('en-IN')}`

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <AppNav />
        <PageContainer className="py-8">
          <Stagger delay={50}>
            <PageHeader eyebrow="Account" title="Profile" description="Manage your details, security and preferences." />
          </Stagger>

          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,880px)]">
            <nav aria-label="Profile sections" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
              <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
                {SECTIONS.map((s) => (
                  <li key={s.id} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => goTo(s.id)}
                      aria-current={active === s.id ? 'true' : undefined}
                      className={`vl-focus flex w-full items-center gap-2.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors lg:rounded-[10px] ${
                        active === s.id
                          ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon name={s.icon} size={16} />
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="min-w-0 space-y-6">
              {/* Identity card */}
              <Stagger delay={100}>
                <div className="vl-card vl-card-hover p-6 sm:p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div
                      aria-hidden="true"
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #818cf8 0%, #4f46e5 55%, #3730a3 100%)' }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
                      <p className="truncate text-sm text-gray-500">{user?.email}</p>
                      {user?.createdAt && (
                        <p className="mt-1 text-xs text-gray-400">Member since {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="min-w-[110px] rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Transactions</p>
                        {stats ? <p className="text-lg font-bold text-gray-900 dark:text-white"><AnimatedNumber value={stats.total} /></p> : <Skeleton className="mt-1 h-6 w-12" />}
                      </div>
                      <div className="min-w-[130px] rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">This month, net</p>
                        {stats
                          ? <p className={`tabular text-lg font-bold ${stats.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{money(stats.net)}</p>
                          : <Skeleton className="mt-1 h-6 w-24" />}
                      </div>
                    </div>
                  </div>
                </div>
              </Stagger>

              <Stagger delay={150}>
                <Section id="personal" title="Personal information" description="Your display name appears across Vaulto.">
                  <form onSubmit={saveName} className="max-w-md space-y-4" noValidate>
                    <Input label="Full name" value={name} onChange={(e) => { setName(e.target.value); setNameError('') }} error={nameError} autoComplete="name" maxLength={60} />
                    <div>
                      <label htmlFor="profile-email" className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                        Email
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-label="Locked" className="text-gray-400">
                          <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" />
                        </svg>
                      </label>
                      <input id="profile-email" value={user?.email || ''} disabled readOnly className="vl-control cursor-not-allowed px-3 opacity-70" />
                      <p className="mt-1.5 text-xs text-gray-400">Email cannot be changed.</p>
                    </div>
                    <Button type="submit" variant="primary" loading={nameLoading} disabled={!nameDirty}>{nameLoading ? 'Saving...' : 'Save changes'}</Button>
                  </form>
                </Section>
              </Stagger>

              <Stagger delay={200}>
                <Section id="security" title="Change password" description="Use at least 6 characters. Longer and mixed is stronger.">
                  <form onSubmit={savePassword} className="max-w-md space-y-4" noValidate>
                    <PasswordField label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                    <div>
                      <PasswordField label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                      {newPassword && (
                        <div className="mt-2" aria-live="polite">
                          <div className="flex gap-1.5" aria-hidden="true">
                            {[1, 2, 3, 4].map((i) => (
                              <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= score ? STRENGTH[score].bar : 'vl-muted-bg'}`} />
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">Strength: {STRENGTH[score].label}</p>
                        </div>
                      )}
                    </div>
                    <PasswordField label="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" error={mismatch ? 'Passwords do not match' : pwError} />
                    <Button type="submit" variant="primary" loading={pwLoading} disabled={!pwReady}>{pwLoading ? 'Updating...' : 'Update password'}</Button>
                  </form>
                </Section>
              </Stagger>

              <Stagger delay={250}>
                <Section id="preferences" title="Preferences" description="How Vaulto looks and displays money on this device.">
                  <div className="grid max-w-xl gap-5 sm:grid-cols-2">
                    <div>
                      <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Appearance</span>
                      <SegmentedControl
                        aria-label="Theme"
                        value={dark ? 'dark' : 'light'}
                        onChange={(v) => { if ((v === 'dark') !== dark) toggleDark() }}
                        options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
                      />
                    </div>
                    <div>
                      <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Currency</span>
                      <Select aria-label="Currency" value="inr" disabled onChange={() => {}} options={[{ value: 'inr', label: 'INR (Rs.) - Default' }]} />
                    </div>
                  </div>
                </Section>
              </Stagger>

              <Stagger delay={300}>
                <Section id="data" title="Your data" description="Download everything you have recorded in Vaulto.">
                  <div className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="sm:w-52">
                      <span className="mb-1.5 block text-[13px] font-medium text-gray-700 dark:text-gray-300">Format</span>
                      <Select aria-label="Export format" value={exportFormat} onChange={setExportFormat} options={EXPORT_OPTIONS} />
                    </div>
                    <Button variant="secondary" onClick={exportData} loading={exporting} disabled={!transactions?.length} leftIcon={<Icon name="download" size={16} />}>
                      {transactions ? `Export ${transactions.length} transactions` : 'Loading...'}
                    </Button>
                  </div>
                </Section>
              </Stagger>

              <Stagger delay={350}>
                <Section id="account" tone="danger" title="Account" description="Sign out of Vaulto on this device.">
                  <button
                    type="button"
                    onClick={() => setConfirmLogout(true)}
                    className="vl-focus inline-flex h-10 items-center gap-2 rounded-[10px] border border-red-300 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    Log out
                  </button>
                </Section>
              </Stagger>
            </div>
          </div>
        </PageContainer>
      </div>

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        size="sm"
        title="Log out of Vaulto?"
        description="You will need to sign in again to see your data."
        footer={(
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmLogout(false)}>Stay signed in</Button>
            <Button variant="danger" className="flex-1" onClick={() => { logout(); navigate('/login') }}>Log out</Button>
          </>
        )}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">Signed in as {user?.email}.</p>
      </Modal>
    </PageWrapper>
  )
}
