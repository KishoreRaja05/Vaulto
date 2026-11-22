import { useEffect, useState } from 'react'

// True once `loading` has lasted `ms` (free-tier servers can take ~30s to wake).
export default function useWakeHint(loading, ms = 5000) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!loading) return undefined
    const t = setTimeout(() => setSlow(true), ms)
    return () => {
      clearTimeout(t)
      setSlow(false)
    }
  }, [loading, ms])
  return loading && slow
}

export const WAKE_MESSAGE = 'Server is waking up. This takes about 30 seconds on first load.'
