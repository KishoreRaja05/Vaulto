import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ChatProvider } from './context/ChatContext'

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <ThemeProvider>
      <ChatProvider>
        <App />
      </ChatProvider>
    </ThemeProvider>
  </AuthProvider>
)
