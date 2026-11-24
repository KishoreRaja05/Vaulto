import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppNav from '../components/AppNav'
import ChatView from '../components/chat/ChatView'
import { useTheme } from '../context/ThemeContext'

function PageWrapper({ children }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.45s cubic-bezier(.4,0,.2,1), transform 0.45s cubic-bezier(.4,0,.2,1)',
    }}>
      {children}
    </div>
  )
}

export default function Chat() {
  const { dark } = useTheme()
  const navigate = useNavigate()
  const { key } = useLocation()

  const handleClose = () => {
    // React Router gives the initial browser entry the key "default"; anything
    // else means the user came from inside the app and can safely go back.
    if (key !== 'default') navigate(-1)
    else navigate('/dashboard', { replace: true })
  }

  return (
    <PageWrapper>
      <div className={`flex h-[100dvh] flex-col transition-colors duration-300 ${dark ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <AppNav />
        <div className="flex min-h-0 w-full max-w-[1760px] flex-1 flex-col mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14 py-4 sm:py-6">
          <div className={`flex min-h-0 w-full flex-1 overflow-hidden rounded-2xl border ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            <ChatView variant="page" onClose={handleClose} />
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
