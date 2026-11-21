import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportTransactions'

export default function ExportMenu({ dark, transactions, meta }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [pos, setPos] = useState({ top: 0, right: 12 })
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const wasOpenRef = useRef(false)

  const disabled = !transactions || transactions.length === 0 || Boolean(busy)

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const margin = 12
    const panelWidth = 256
    let right = window.innerWidth - rect.right
    if (window.innerWidth - right - panelWidth < margin) right = window.innerWidth - margin - panelWidth
    if (right < margin) right = margin
    setPos({ top: rect.bottom + 8, right })
  }

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      buttonRef.current?.focus()
    }
    wasOpenRef.current = open
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    updatePosition()
    const onResize = () => updatePosition()
    const onScroll = () => setOpen(false)
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const onPointerDown = (event) => {
      if (buttonRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      setOpen(false)
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [open])

  const runExport = async (kind) => {
    if (!transactions?.length || busy) return
    setError('')
    setBusy(kind)
    try {
      if (kind === 'csv') exportToCSV(transactions, meta)
      if (kind === 'xlsx') await exportToExcel(transactions, meta)
      if (kind === 'pdf') exportToPDF(transactions, meta)
      setOpen(false)
    } catch (err) {
      console.error(err)
      setError('Could not generate export.')
    } finally {
      setBusy('')
    }
  }

  const menuItemClass = `w-full text-left px-3 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
    dark ? 'text-gray-200 hover:bg-gray-800 disabled:hover:bg-transparent' : 'text-gray-700 hover:bg-gray-50 disabled:hover:bg-transparent'
  }`

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setError(''); setOpen((v) => !v) }}
        className={`inline-flex items-center justify-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-all duration-200 ${
          dark
            ? 'bg-gray-900 border-gray-700 text-gray-200 hover:border-indigo-500 hover:text-white'
            : 'bg-white border-gray-300 text-gray-700 hover:border-indigo-300 hover:text-indigo-700'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        Export
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            zIndex: 60,
            maxWidth: 'calc(100vw - 24px)',
          }}
          className={`w-64 rounded-xl border shadow-lg p-2 ${
            dark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className={`px-3 py-2 text-xs font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            {meta?.headerLabel || 'Export transactions'}
          </div>
          <div className={`my-1 border-t ${dark ? 'border-gray-800' : 'border-gray-100'}`} />
          {transactions?.length ? (
            <>
              <button type="button" role="menuitem" disabled={disabled} onClick={() => runExport('csv')} className={menuItemClass}>
                {busy === 'csv' ? 'Generating CSV...' : 'CSV'}
              </button>
              <button type="button" role="menuitem" disabled={disabled} onClick={() => runExport('xlsx')} className={menuItemClass}>
                {busy === 'xlsx' ? 'Generating Excel...' : 'Excel (.xlsx)'}
              </button>
              <button type="button" role="menuitem" disabled={disabled} onClick={() => runExport('pdf')} className={menuItemClass}>
                {busy === 'pdf' ? 'Generating PDF...' : 'PDF'}
              </button>
            </>
          ) : (
            <div className={`px-3 py-2 text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Nothing to export</div>
          )}
          {error && <div className="px-3 pt-2 text-xs text-red-500">{error}</div>}
        </div>,
        document.body
      )}
    </div>
  )
}
