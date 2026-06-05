import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from './ThemeToggle'

const links = [
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
  { to: '/analytics', label: 'Analytics', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )},
  { to: '/settings', label: 'Settings', icon: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )},
]

export default function AppNav() {
  const { user, logout } = useAuth()
  const { dark } = useTheme()
  const d = dark
  const location = useLocation()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* ── Top navbar ── */}
      <nav
        className={`sticky top-0 z-50 border-b ${d ? 'border-gray-800' : 'border-gray-200'}`}
        style={{
          backdropFilter: 'blur(12px)',
          backgroundColor: d ? 'rgba(3,7,18,0.92)' : 'rgba(255,255,255,0.92)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">

              {/* Logo — click opens drawer on mobile, goes to dashboard on desktop */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex md:hidden items-center gap-2 group"
              >
                <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <span className={`font-bold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>Vaulto</span>
              </button>
              <Link to="/dashboard" className="hidden md:flex items-center gap-2 group">
                <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <span className={`font-bold text-sm ${d ? 'text-white' : 'text-gray-900'}`}>Vaulto</span>
              </Link>

              {/* Desktop nav links */}
              <div className="hidden md:flex items-center gap-5 h-14">
                {links.map(link => {
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
              <div className={`hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 border transition-colors ${d ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
                <span className={`text-sm font-medium ${d ? 'text-gray-200' : 'text-gray-700'}`}>{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className={`text-xs border px-3 py-1.5 rounded-lg transition-all duration-200 ${d ? 'text-gray-500 border-gray-700 hover:text-red-400 hover:border-red-800' : 'text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-200'}`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

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
          <div className="flex items-center gap-2 mt-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{user?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className={`text-sm font-semibold ${d ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
              <p className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, padding: '12px 12px' }}>
          {links.map(link => {
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

        {/* Logout at bottom */}
        <div style={{ padding: '16px', borderTop: `1px solid ${d ? '#1f2937' : '#f3f4f6'}` }}>
          <button
            onClick={() => { setDrawerOpen(false); handleLogout() }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              borderRadius: '10px',
              color: '#ef4444',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
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
        <div className="flex items-center justify-around h-16 px-2">
          {links.map(link => {
            const active = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors duration-200 ${
                  active ? 'text-indigo-600' : d ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {link.icon}
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom padding so content isn't hidden behind bottom nav */}
      <div className="md:hidden h-16" />
    </>
  )
}