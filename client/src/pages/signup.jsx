import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import AuthShell, { AuthError, OrDivider, SocialButtons } from '../components/AuthShell'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const rotatingTexts = [
  'Track every rupee you earn.',
  'Know where your money goes.',
  'Spot spending patterns instantly.',
  'Improve your savings every month.',
  'Financial clarity starts here.',
]

export default function Signup() {
  const [step, setStep] = useState('email') // 'email' | 'full'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [textIndex, setTextIndex] = useState(0)
  const [fade, setFade] = useState(true)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Rotating tagline under the form
  useEffect(() => {
    let swap
    const interval = setInterval(() => {
      setFade(false)
      swap = setTimeout(() => {
        setTextIndex((i) => (i + 1) % rotatingTexts.length)
        setFade(true)
      }, 300)
    }, 2800)
    return () => { clearInterval(interval); clearTimeout(swap) }
  }, [])

  const handleEmailContinue = (e) => {
    e.preventDefault()
    if (email) setStep('full')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/signup', { name, email, password })
      login(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      topLink={{ to: '/login', label: 'Log in' }}
      footer={(
        <div className="flex items-center justify-center gap-2 px-6 py-5">
          <span className="text-sm font-medium text-gray-400">Vaulto -</span>
          <span className="text-sm font-semibold text-gray-600 transition-opacity duration-300 dark:text-gray-300" style={{ opacity: fade ? 1 : 0 }}>{rotatingTexts[textIndex]}</span>
        </div>
      )}
    >
      <h1 className="mb-6 text-2xl font-bold leading-tight text-gray-900 dark:text-white">Your finances, finally under control.</h1>
      <AuthError>{error}</AuthError>

      {step === 'email' ? (
        <>
          <form onSubmit={handleEmailContinue} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
            <Button type="submit" variant="primary" className="w-full">Continue with email</Button>
          </form>
          <OrDivider />
          <SocialButtons />
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" autoFocus placeholder="Your name" />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <div className="relative">
            <Input label="Password" type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" className="pr-14" />
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
          <Button type="submit" variant="primary" className="w-full" loading={loading}>Create account</Button>
          <button type="button" onClick={() => setStep('email')} className="vl-focus w-full rounded text-center text-xs text-gray-500 hover:text-gray-700">Back</button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="vl-focus rounded font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Log in</Link>
      </p>
    </AuthShell>
  )
}
