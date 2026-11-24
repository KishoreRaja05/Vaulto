import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useChat } from '../context/ChatContext'
import ThemeToggle from './ThemeToggle'
import InstallButton from './InstallButton'
import Icon from './ui/Icon'
import { useDismiss } from './ui/usePopover'

const profileIcon = (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
  </svg>
)

const mainLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 011 1m-6 0h6" />
    </svg>
  ) },
  { to: '/transactions', label: 'Transactions', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ) },
  { to: '/chat', label: 'Assistant', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5m-9 6l4-4h8a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ) },
  { to: '/analytics', label: 'Analytics', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ) },
  { to: '/learn', label: 'Learn', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5C10.7 5.4 8.8 4.7 6.5 4.7c-1.1 0-2.2.2-3.1.5v13.6c.9-.3 2-.5 3.1-.5 2.3 0 4.2.7 5.5 1.9 1.3-1.2 3.2-1.9 5.5-1.9 1.1 0 2.2.2 3.1.5V5.2c-.9-.3-2-.5-3.1-.5-2.3 0-4.2.7-5.5 1.8zM12 6.5v13.7" />
    </svg>
  ) },
]

// Mobile tab bar: profile and theme controls live in the three-dot menu.
const bottomLinks = [
  mainLinks[0],
  mainLinks[1],
  mainLinks[3],
  { ...mainLinks[2], label: 'AI Assistant' },
]

export default function AppNav() {
  const { user, logout } = useAuth()
  const { dark } = useTheme()
  const { newChat } = useChat()
  const d = dark
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  // Desktop sidebar padding is always present.
  useEffect(() => {
    document.body.classList.add('has-sidebar')
    return () => document.body.classList.remove('has-sidebar', 'sidebar-collapsed')
  }, [])

  // The chat route owns the full mobile viewport: no bottom tab bar, no spacer.
  useEffect(() => {
    document.body.classList.toggle('has-bottom-nav', location.pathname !== '/chat')
    return () => document.body.classList.remove('has-bottom-nav')
  }, [location.pathname])

  // Desktop sidebar can collapse to icons; the choice is remembered.
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('vaulto_sidebar_collapsed') === '1' } catch { return false }
  })
  useEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', collapsed)
    try { localStorage.setItem('vaulto_sidebar_collapsed', collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed])

  const closeMenu = () => setMenuOpen(false)
  useDismiss(menuOpen, closeMenu, [menuRef, triggerRef])

  const handleLogout = () => {
    closeMenu()
    logout()
    navigate('/login')
  }

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
              <Link to="/dashboard" className="flex items-center gap-2" aria-label="Vaulto dashboard">
                <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <span className={`font-bold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>Vaulto</span>
              </Link>

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

            <div className="flex items-center gap-2">
              <div className="hidden md:block"><ThemeToggle /></div>
              <Link to="/profile" aria-label="Open your profile" className={`hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 border transition-colors vl-focus ${d ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
                <span className={`text-sm font-medium ${d ? 'text-gray-200' : 'text-gray-700'}`}>{user?.name}</span>
              </Link>
              <button
                ref={triggerRef}
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Open app menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className={`vl-focus flex h-11 w-11 items-center justify-center rounded-lg ${d ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="5" r="1.7" />
                  <circle cx="12" cy="12" r="1.7" />
                  <circle cx="12" cy="19" r="1.7" />
                </svg>
              </button>
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
                    onClick={() => { if (link.to === '/chat') newChat() }}
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
              <InstallButton variant="sidebar" />
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

          {/* ── Mobile app menu (anchored to the three-dot button) ── */}
          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              className={`vl-pop fixed right-4 top-[3.5rem] z-[70] w-60 overflow-hidden rounded-xl border shadow-xl md:hidden ${
                d ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'
              }`}
            >
              <div className={`border-b px-4 py-3 ${d ? 'border-gray-800' : 'border-gray-200'}`}>
                <p className={`truncate text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>{user?.name || 'Vaulto user'}</p>
                <p className={`truncate text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>{user?.email || ''}</p>
              </div>
              <div className="p-1.5">
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={closeMenu}
                  className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${d ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {profileIcon}
                  Profile
                </Link>
                <div
                  role="menuitem"
                  tabIndex={0}
                  onClick={closeMenu}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeMenu() } }}
                  className={`flex h-11 items-center justify-between rounded-lg px-3 text-sm ${d ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <span className="flex items-center gap-3">
                    <Icon name="sparkle" size={17} />
                    Dark mode
                  </span>
                  <span onClick={(e) => e.stopPropagation()}><ThemeToggle /></span>
                </div>
              </div>
              <div className={`border-t p-1.5 ${d ? 'border-gray-800' : 'border-gray-200'}`}>
                <InstallButton variant="menu" onAfterClick={closeMenu} />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Icon name="undo" size={17} />
                  Logout
                </button>
              </div>
            </div>
          )}

          {/* ── Bottom nav — mobile only; hidden on /chat so chat owns the screen ── */}
          {location.pathname !== '/chat' && (
          <nav
            className={`fixed bottom-0 left-0 right-0 z-50 border-t pb-[env(safe-area-inset-bottom)] md:hidden ${d ? 'border-gray-800' : 'border-gray-200'}`}
            style={{
              backdropFilter: 'blur(12px)',
              backgroundColor: d ? 'rgba(3,7,18,0.95)' : 'rgba(255,255,255,0.95)',
            }}
          >
            <div className="flex h-16 items-stretch justify-around px-1">
              {bottomLinks.map(link => {
                const active = location.pathname === link.to
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => { if (link.to === '/chat') newChat() }}
                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 px-0.5 transition-colors duration-200 ${
                      active ? 'text-indigo-600' : d ? 'text-gray-500' : 'text-gray-400'
                    }`}
                  >
                    {link.icon}
                    <span className="w-full truncate text-center text-[10px] font-medium leading-tight">{link.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
          )}
        </>,
        document.body
      )}
    </>
  )
}
