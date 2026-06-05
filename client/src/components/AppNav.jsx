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
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      {/* ── Top navbar ── */}
      <nav
        className={`sticky top-0 z-50 border-b ${dark ? 'border-gray-800' : 'border-gray-200'}`}
        style={{
          backdropFilter: 'blur(12px)',
          backgroundColor: dark ? 'rgba(3,7,18,0.92)' : 'rgba(255,255,255,0.92)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              {/* Logo → dashboard */}
              <Link to="/dashboard" className="flex items-center gap-2 group">
                <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <span className="text-white font-bold text-xs">V</span>
                </div>
                <span className={`font-bold text-sm ${dark ? 'text-white' : 'text-gray-900'}`}>Vaulto</span>
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
                          : `border-transparent ${dark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-900'}`
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
              <div className={`hidden sm:flex items-center gap-2 rounded-lg px-3 py-1.5 border transition-colors ${dark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
                <span className={`text-sm font-medium ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className={`text-xs border px-3 py-1.5 rounded-lg transition-all duration-200 ${dark ? 'text-gray-500 border-gray-700 hover:text-red-400 hover:border-red-800' : 'text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-200'}`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Bottom nav — mobile only ── */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 md:hidden border-t ${dark ? 'border-gray-800' : 'border-gray-200'}`}
        style={{
          backdropFilter: 'blur(12px)',
          backgroundColor: dark ? 'rgba(3,7,18,0.95)' : 'rgba(255,255,255,0.95)',
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
                  active
                    ? 'text-indigo-600'
                    : dark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {link.icon}
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Bottom padding so content isn't hidden behind bottom nav on mobile ── */}
      <div className="md:hidden h-16" />
    </>
  )
}