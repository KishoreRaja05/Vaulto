import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from './ThemeToggle'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/settings', label: 'Settings' },
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
    <nav
      className="bg-white border-b border-gray-200 sticky top-0 z-50"
      style={{
        backdropFilter: 'blur(12px)',
        backgroundColor: dark ? 'rgba(3,7,18,0.92)' : 'rgba(255,255,255,0.92)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <span className="text-white font-bold text-xs">V</span>
              </div>
              <span className="font-bold text-gray-900 text-sm">Vaulto</span>
            </Link>
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
                        : 'text-gray-500 hover:text-gray-900 border-transparent'
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
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors hover:border-gray-300">
              <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
              </div>
              <span className="text-sm text-gray-700 font-medium">{user?.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
