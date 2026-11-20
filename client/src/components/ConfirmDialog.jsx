import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../context/ThemeContext'

// Reusable destructive-action confirmation. Rendered in a portal so it is
// never clipped by a parent modal's overflow, and matches the Analytics modal
// behaviour: Esc / backdrop cancel, body scroll lock, Cancel focused first.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  danger = true,
  loading = false,
  error = '',
  onConfirm,
  onCancel,
}) {
  const { dark } = useTheme()
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => cancelRef.current?.focus())
    return () => {
      document.body.style.overflow = previous
      cancelAnimationFrame(frame)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handler = (event) => {
      if (event.key === 'Escape' && !loading) {
        event.stopPropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, loading, onCancel])

  if (!open) return null

  const borderColor = dark ? '#374151' : '#e5e7eb'
  const cardBg = dark ? '#111827' : '#ffffff'
  const textMain = dark ? '#f9fafb' : '#111827'
  const textMuted = dark ? '#9ca3af' : '#6b7280'

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
      <div
        onClick={() => { if (!loading) onCancel() }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          borderRadius: '16px',
          border: `1px solid ${borderColor}`,
          background: cardBg,
          padding: '22px 24px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: danger ? (dark ? 'rgba(239,68,68,0.15)' : '#fef2f2') : (dark ? '#1f2937' : '#eef2ff'),
            color: danger ? '#ef4444' : '#6366f1',
          }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 id="confirm-dialog-title" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: textMain }}>{title}</h3>
            <p id="confirm-dialog-message" style={{ margin: '6px 0 0', fontSize: '13px', lineHeight: 1.5, color: textMuted }}>{message}</p>
          </div>
        </div>

        {error && (
          <p role="alert" style={{ margin: '12px 0 0', fontSize: '12px', color: '#dc2626' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
          <button
            ref={cancelRef}
            type="button"
            disabled={loading}
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: 500,
              border: `1px solid ${dark ? '#374151' : '#d1d5db'}`,
              background: 'transparent', color: textMuted,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            style={{
              flex: 1, padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: 600,
              border: 'none', color: '#ffffff',
              background: loading ? '#818cf8' : (danger ? '#dc2626' : '#4f46e5'),
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
