import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing from './pages/landing'
import Login from './pages/login'
import Signup from './pages/signup'
import Dashboard from './pages/dashboard'
import Transactions from './pages/transaction'
import Analytics from './pages/analytics'
import Profile from './pages/profile'
import Chat from './pages/Chat'
import Learn from './pages/Learn'
import ChatWidget from './components/chat/ChatWidget'
import { PageContextProvider } from './context/PageContext'

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" />
}

// One floating assistant for the whole signed-in app. It mounts here (not per page)
// so the conversation survives navigation. Hidden on public pages and on /chat,
// which already is the full-page assistant.
const HIDDEN_ON = ['/', '/login', '/signup', '/chat']
const ChatWidgetGate = () => {
  const { token } = useAuth()
  const { pathname } = useLocation()
  if (!token || HIDDEN_ON.includes(pathname)) return null
  return <ChatWidget />
}

export default function App() {
  return (
    <PageContextProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/learn" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<Navigate to="/profile" replace />} />
      </Routes>
      <ChatWidgetGate />
    </BrowserRouter>
    </PageContextProvider>
  )
}