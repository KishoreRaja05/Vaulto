import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from './ThemeToggle'
import Icon from './ui/Icon'

const mainLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { to: '/transactions', label: 'Transactions', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )},
  { to: '/chat', label: 'Assistant', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5m-9 6l4-4h8a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )},
  { to: '/analytics', label: 'Analytics', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )},
  { to: '/learn', label: 'Learn', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5C10.7 5.4 8.8 4.7 6.5 4.7c-1.1 0-2.2.2-3.1.5v13.6c.9-.3 2-.5 3.1-.5 2.3 0 4.2.7 5.5 1.9 1.3-1.2 3.2-1.9 5.5-1.9 1.1 0 2.2.2 3.1.5V5.2c-.9-.3-2-.5-3.1-.5-2.3 0-4.2.7-5.5 1.8zM12 6.5v13.7" />
    </svg>
  )},
  { to: '/profile', label: 'Profile', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
    </svg>
  )},
]

// Shown in the mobile bottom tab bar (Learn omitted to save space).
const bottomLinks = mainLinks.filter((link) => link.to !== '/learn')

export default function AppNav() {
  const { user } = useAuth()
  const { dark } = useTheme()
  const d = dark
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Reserve room for the fixed mobile bottom nav at the end of the page (see index.css).
  useEffect(() => {
    document.body.classList.add('has-bottom-nav', 'has-sidebar')
    return () => document.body.classList.remove('has-bottom-nav', 'has-sidebar', 'sidebar-collapsed')
  }, [])

  // Desktop sidebar can collapse to icons; the choice is remembered.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('vaulto_sidebar_collapsed') === '1' } catch { return false }
  })
  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', collapsed)
    try { localStorage.setItem('vaulto_sidebar_collapsed', collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed])

  return (
    <>
      {/* ── Mobile top bar ── */}
      <nav
        className={`sticky top-0 z-50 border-b md:hidden ${d ? 'border-gray-800' : 'border-gray-200'}`}
        style={{
          backdropFilter: 'blur(12px)',
          backgroundColor: d ? 'rgba(3,7,18,0.92)' : 'rgba(255,255,255,0.92)',
        }}
      >
        <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">

              {/* Logo — toggles sidebar/drawer */}
              <button
                type="button"
                aria-label="Toggle sidebar"
                onClick={() => setDrawerOpen((v) => !v)}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <span className={`font-bold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>Vaulto</span>
              </button>

              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-5 h-14">
                {mainLinks.map(link => {
                  const active = location.pathname === link.to
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`text-sm font-medium transition-all duration-200 px-1 pb-0.5 border-b-2 ${
                        active
                          ? 'text-indigo-600 border-indigo-600'
                          : `border-transparent ${d ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'}`
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link to="/profile" aria-label="Open your profile" className={`hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 border transition-colors vl-focus ${d ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
                <span className={`text-sm font-medium ${d ? 'text-gray-200' : 'text-gray-700'}`}>{user?.name}</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Fixed UI is portaled: PageWrapper keeps a transform, which would re-anchor fixed children. */}
      {createPortal(
        <>
      {/* ── Desktop sidebar ── */}
      <aside className="vl-sidebar hidden md:flex" aria-label="Main navigation">
        <div className="flex h-14 shrink-0 items-center gap-2 px-4">
          <button
            type="button"
            aria-label="Toggle sidebar"
            onClick={() => setCollapsed((v) => !v)}
            className="vl-focus flex items-center gap-2 rounded-md cursor-pointer group"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600 transition-transform duration-200 group-hover:scale-110"><span className="text-xs font-bold text-white">V</span></span>
            <span className="vl-sidebar-label text-sm font-bold text-gray-900 dark:text-white">Vaulto</span>
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {mainLinks.map((link) => {
            const active = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                title={link.label}
                aria-current={active ? 'page' : undefined}
                className={`vl-focus flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <span className="shrink-0">{link.icon}</span>
                <span className="vl-sidebar-label">{link.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="shrink-0 space-y-2 border-t border-gray-100 p-3 dark:border-gray-800">
          <Link to="/profile" title="Profile" className="vl-focus flex items-center gap-3 rounded-[10px] px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
            <span className="vl-sidebar-label min-w-0">
              <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</span>
              <span className="block truncate text-xs text-gray-400">{user?.email}</span>
            </span>
          </Link>
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-pressed={collapsed}
              className="vl-focus vl-sidebar-collapse flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile drawer ── */}
      {/* Backdrop */}
      <div
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          opacity: drawerOpen ? 1 : 0,
          pointerEvents: drawerOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: '72%', maxWidth: '280px',
          zIndex: 70,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
          backgroundColor: d ? '#030712' : '#ffffff',
          borderRight: `1px solid ${d ? '#1f2937' : '#e5e7eb'}`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Drawer header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${d ? '#1f2937' : '#f3f4f6'}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">V</span>
              </div>
              <span className={`font-bold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>Vaulto</span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${d ? 'text-gray-500 hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User info */}
          <Link to="/profile" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 mt-4 rounded-lg vl-focus">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
              <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>{user?.email}</p>
            </div>
          </Link>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, padding: '12px 12px' }}>
          {mainLinks.map(link => {
            const active = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setDrawerOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 12px',
                  borderRadius: '10px',
                  marginBottom: '4px',
                  color: active ? '#4f46e5' : d ? '#9ca3af' : '#6b7280',
                  backgroundColor: active ? (d ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)') : 'transparent',
                  fontWeight: active ? 600 : 400,
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {link.icon}
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Bottom nav — mobile only ── */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t ${d ? 'border-gray-800' : 'border-gray-200'}`}
        style={{
          backdropFilter: 'blur(12px)',
          backgroundColor: d ? 'rgba(3,7,18,0.95)' : 'rgba(255,255,255,0.95)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {bottomLinks.map(link => {
            const active = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 px-0.5 transition-colors duration-200 ${
                  active ? 'text-indigo-600' : d ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {link.icon}
                <span className="text-[10px] font-medium leading-tight text-center truncate w-full">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

        </>,
        document.body
      )}
    </>
  )
}