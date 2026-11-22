import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

/* eslint-disable react-refresh/only-export-components */

const ToastContext = createContext(null)

const TONES = {
  success: { icon: 'check', color: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: 'alert', color: 'text-red-600 dark:text-red-400' },
  info: { icon: 'info', color: 'text-indigo-600 dark:text-indigo-400' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const push = useCallback((tone, message, opts = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => [...prev.slice(-3), { id, tone, message, action: opts.action }])
    timers.current.set(id, setTimeout(() => dismiss(id), opts.duration ?? (tone === 'error' ? 6000 : 4000)))
    return id
  }, [dismiss])

  useEffect(() => {
    const map = timers.current
    return () => map.forEach(clearTimeout)
  }, [])

  const api = useMemo(() => ({
    success: (m, o) => push('success', m, o),
    error: (m, o) => push('error', m, o),
    info: (m, o) => push('info', m, o),
    dismiss,
  }), [push, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 z-[300] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end"
          style={{ bottom: 'calc(88px + env(safe-area-inset-bottom))' }}
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className="vl-pop vl-panel pointer-events-auto flex w-full max-w-sm items-start gap-3 px-4 py-3 sm:w-auto sm:min-w-[300px]"
            >
              <Icon name={TONES[t.tone].icon} size={18} className={`mt-0.5 shrink-0 ${TONES[t.tone].color}`} />
              <p className="flex-1 text-sm text-gray-800 dark:text-gray-100">{t.message}</p>
              {t.action && (
                <button
                  type="button"
                  onClick={() => { t.action.onClick(); dismiss(t.id) }}
                  className="vl-focus rounded text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="vl-focus -mr-1 rounded p-0.5 text-gray-400 hover:text-gray-600"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
