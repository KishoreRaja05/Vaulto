import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import AuthShell, { AuthError, OrDivider, SocialButtons } from '../components/AuthShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      login(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell topLink={{ to: '/signup', label: 'Sign up' }}>
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-white">Log in to Vaulto</h1>
      <p className="mb-6 text-sm text-gray-500">Welcome back</p>

      <AuthError>{error}</AuthError>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
        <div className="relative">
          <Input label="Password" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="Your password" className="pr-14" />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? 'Hide password' : 'Show password'}
            aria-pressed={showPass}
            className="vl-focus absolute bottom-0 right-1 flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600"
          >
            <span className="text-[11px] font-medium">{showPass ? 'Hide' : 'Show'}</span>
          </button>
        </div>
        <Button type="submit" variant="primary" className="w-full" loading={loading}>Continue with email</Button>
      </form>

      <OrDivider />
      <SocialButtons />

      <p className="mt-6 text-center text-xs text-gray-500">
        No account?{' '}
        <Link to="/signup" className="vl-focus rounded font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Sign up free</Link>
      </p>
    </AuthShell>
  )
}
