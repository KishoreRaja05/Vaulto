import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import api from '../services/api'
import { useTheme } from '../context/ThemeContext'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.pdf', '.png', '.jpg', '.jpeg']
const CATEGORY_OPTIONS = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Salary', 'Freelance', 'Other']

const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const normalizeDateInput = (value) => {
  const text = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

const buildRow = (row, index) => ({
  key: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
  checked: !row.duplicate,
  duplicate: Boolean(row.duplicate),
  date: normalizeDateInput(row.date),
  description: String(row.description || '').slice(0, 200),
  amount: row.amount === '' || row.amount == null ? '' : String(row.amount),
  type: row.type === 'income' ? 'income' : 'expense',
  category: CATEGORY_OPTIONS.includes(row.category) ? row.category : 'Other',
})

export default function ImportModal({ open, onClose, onImported }) {
  const { dark } = useTheme()
  const d = dark
  const [step, setStep] = useState('upload')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [showWakeHint, setShowWakeHint] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef(null)
  const wakeTimerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) return
    setStep('upload')
    setFile(null)
    setDragging(false)
    setParsing(false)
    setParseError('')
    setShowWakeHint(false)
    setWarnings([])
    setRows([])
    setImporting(false)
    setImportError('')
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
  }, [open])

  const selectedRows = useMemo(() => rows.filter((row) => row.checked), [rows])
  const selectedIncome = useMemo(
    () => selectedRows.filter((r) => r.type === 'income').reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [selectedRows]
  )
  const selectedExpenses = useMemo(
    () => selectedRows.filter((r) => r.type === 'expense').reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [selectedRows]
  )

  if (!open) return null

  const validateFile = (candidate) => {
    if (!candidate) return 'Choose a file to upload.'
    const name = String(candidate.name || '').toLowerCase()
    const extOk = ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
    if (!extOk) return 'Unsupported file type. Use CSV, XLSX, PDF, PNG, JPG, or JPEG.'
    if (candidate.size > MAX_UPLOAD_BYTES) return 'File is too large. Maximum size is 5 MB.'
    return ''
  }

  const handleFile = (candidate) => {
    const error = validateFile(candidate)
    if (error) {
      setParseError(error)
      setFile(null)
      return
    }
    setParseError('')
    setFile(candidate)
  }

  const startWakeTimer = () => {
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
    setShowWakeHint(false)
    wakeTimerRef.current = setTimeout(() => setShowWakeHint(true), 5000)
  }

  const stopWakeTimer = () => {
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
    wakeTimerRef.current = null
    setShowWakeHint(false)
  }

  const parseFile = async () => {
    const error = validateFile(file)
    if (error) {
      setParseError(error)
      return
    }
    setParsing(true)
    setParseError('')
    setWarnings([])
    setRows([])
    startWakeTimer()
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/import/parse', formData)
      const data = res.data || {}
      const parsedRows = Array.isArray(data.transactions) ? data.transactions : []
      setWarnings(Array.isArray(data.warnings) ? data.warnings : [])
      setRows(parsedRows.map((row, index) => buildRow(row, index)))
      setStep('preview')
    } catch (err) {
      console.error(err)
      const message = err?.response?.data?.message || 'Could not parse the file. Please try again.'
      setParseError(message)
    } finally {
      stopWakeTimer()
      setParsing(false)
    }
  }

  const updateRow = (key, patch) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  const removeRow = (key) => {
    setRows((prev) => prev.filter((row) => row.key !== key))
  }

  const importSelected = async () => {
    if (importing) return
    const payloadRows = selectedRows.map((row) => ({
      date: row.date,
      description: String(row.description || '').slice(0, 200),
      amount: Number(row.amount),
      type: row.type,
      category: String(row.category || '').slice(0, 40),
    }))

    if (payloadRows.length === 0) {
      setImportError('Select at least one transaction to import.')
      return
    }

    const invalidIndex = payloadRows.findIndex((row) => (
      !row.date || !Number.isFinite(row.amount) || row.amount <= 0 || !['income', 'expense'].includes(row.type) || !row.category
    ))
    if (invalidIndex !== -1) {
      setImportError(`Check row ${invalidIndex + 1}: date, amount, type and category are required.`)
      return
    }

    setImporting(true)
    setImportError('')
    try {
      const res = await api.post('/transactions/bulk', { transactions: payloadRows })
      const inserted = Number(res?.data?.inserted ?? payloadRows.length)
      onImported?.(inserted)
      onClose()
    } catch (err) {
      console.error(err)
      const message = err?.response?.data?.message || 'Could not import transactions. Please try again.'
      setImportError(message)
    } finally {
      setImporting(false)
    }
  }

  const border = d ? '#1f2937' : '#e5e7eb'
  const panelBg = d ? '#111827' : '#ffffff'
  const muted = d ? '#9ca3af' : '#6b7280'
  const inputClass = `w-full min-w-0 rounded-lg border px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/30 ${
    d ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 70, display: 'flex',
          alignItems: 'center', justifyContent: 'center', padding: '24px 16px', pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%', maxWidth: step === 'preview' ? '980px' : '560px', maxHeight: '90vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            borderRadius: '16px', border: `1px solid ${border}`, background: panelBg, pointerEvents: 'auto',
          }}
        >
          <div style={{ padding: '20px 24px 16px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: d ? '#f9fafb' : '#111827' }}>Import transactions</h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: muted }}>
                {step === 'upload' ? 'Upload a statement or receipt to review before importing.' : 'Review, edit and select the transactions to import.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Close import"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 24px' }}>
            {step === 'upload' ? (
              <div>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setDragging(false)
                    handleFile(e.dataTransfer.files?.[0] || null)
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                    dragging
                      ? (d ? 'border-indigo-500 bg-indigo-900/20' : 'border-indigo-400 bg-indigo-50')
                      : (d ? 'border-gray-700 hover:border-gray-600 bg-gray-800/40' : 'border-gray-300 hover:border-gray-400 bg-gray-50')
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.pdf,.png,.jpg,.jpeg"
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  />
                  <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${d ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-500 border border-gray-200'}`}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                    </svg>
                  </div>
                  <p className={`text-sm font-medium ${d ? 'text-gray-200' : 'text-gray-800'}`}>
                    {file ? file.name : 'Drag and drop a file, or click to browse'}
                  </p>
                  <p className={`text-xs mt-1 ${d ? 'text-gray-500' : 'text-gray-500'}`}>CSV, XLSX, PDF, PNG, JPG, or JPEG up to 5 MB</p>
                </div>
                <p className={`text-xs mt-3 ${d ? 'text-gray-500' : 'text-gray-500'}`}>
                  Bank statements work best as CSV/Excel or text-based PDF. Files are processed and not stored.
                </p>
                {parseError && <p className="text-sm text-red-500 mt-3">{parseError}</p>}
                {parsing && (
                  <div className={`mt-4 text-sm ${d ? 'text-gray-300' : 'text-gray-700'}`}>
                    Parsing file...
                    {showWakeHint && (
                      <p className={`text-xs mt-1 ${d ? 'text-gray-500' : 'text-gray-500'}`}>
                        Server is waking up. This takes about 30 seconds on first load.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {warnings.length > 0 && (
                  <div className={`mb-4 rounded-xl border p-3 ${d ? 'border-amber-800/60 bg-amber-900/20' : 'border-amber-200 bg-amber-50'}`}>
                    <p className={`text-xs font-semibold mb-1 ${d ? 'text-amber-300' : 'text-amber-700'}`}>Import notes</p>
                    <ul className={`text-xs space-y-1 ${d ? 'text-amber-200/90' : 'text-amber-800'}`}>
                      {warnings.map((warning, index) => <li key={index}>{String(warning)}</li>)}
                    </ul>
                  </div>
                )}

                {rows.length === 0 ? (
                  <div className={`rounded-xl border p-6 text-center ${d ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                    No transactions were found in this file.
                  </div>
                ) : (
                  <div className={`rounded-xl border overflow-hidden ${d ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="overflow-x-auto">
                      <table className="min-w-[900px] w-full text-sm">
                        <thead className={d ? 'bg-gray-800/70 text-gray-300' : 'bg-gray-50 text-gray-600'}>
                          <tr>
                            <th className="text-left font-medium px-3 py-2.5 w-12">Use</th>
                            <th className="text-left font-medium px-3 py-2.5 w-36">Date</th>
                            <th className="text-left font-medium px-3 py-2.5">Description</th>
                            <th className="text-left font-medium px-3 py-2.5 w-32">Amount</th>
                            <th className="text-left font-medium px-3 py-2.5 w-32">Type</th>
                            <th className="text-left font-medium px-3 py-2.5 w-40">Category</th>
                            <th className="text-left font-medium px-3 py-2.5 w-20">Action</th>
                          </tr>
                        </thead>
                        <tbody className={d ? 'divide-y divide-gray-800' : 'divide-y divide-gray-100'}>
                          {rows.map((row) => (
                            <tr key={row.key} className={d ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50/60'}>
                              <td className="px-3 py-2 align-top">
                                <input
                                  type="checkbox"
                                  checked={row.checked}
                                  onChange={(e) => updateRow(row.key, { checked: e.target.checked })}
                                  className="mt-2 accent-indigo-600"
                                  aria-label="Select row"
                                />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input type="date" value={row.date} onChange={(e) => updateRow(row.key, { date: e.target.value })} className={inputClass} />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input type="text" value={row.description} maxLength={200} onChange={(e) => updateRow(row.key, { description: e.target.value })} className={inputClass} placeholder="Description" />
                                {row.duplicate && (
                                  <span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${d ? 'bg-amber-900/30 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                    Possible duplicate
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 align-top">
                                <input type="number" min="0" step="0.01" value={row.amount} onChange={(e) => updateRow(row.key, { amount: e.target.value })} className={inputClass} placeholder="0.00" />
                              </td>
                              <td className="px-3 py-2 align-top">
                                <select value={row.type} onChange={(e) => updateRow(row.key, { type: e.target.value })} className={inputClass}>
                                  <option value="expense">Expense</option>
                                  <option value="income">Income</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <select value={row.category} onChange={(e) => updateRow(row.key, { category: e.target.value })} className={inputClass}>
                                  {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
                                </select>
                              </td>
                              <td className="px-3 py-2 align-top">
                                <button
                                  type="button"
                                  onClick={() => removeRow(row.key)}
                                  className={`text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${d ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {importError && <p className="text-sm text-red-500 mt-3">{importError}</p>}
              </div>
            )}
          </div>

          <div style={{ padding: '16px 24px 20px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
            {step === 'upload' ? (
              <>
                <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-500'}`}>Step 1 of 2</span>
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium border ${d ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>Cancel</button>
                  <button
                    type="button"
                    onClick={parseFile}
                    disabled={parsing || !file}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {parsing ? 'Parsing...' : 'Continue'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`text-xs ${d ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className="font-medium">{selectedRows.length}</span> selected
                  <span className="mx-2 text-gray-400">|</span>
                  Income {formatMoney(selectedIncome)}
                  <span className="mx-2 text-gray-400">|</span>
                  Expenses {formatMoney(selectedExpenses)}
                </div>
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={() => { setStep('upload'); setImportError('') }} className={`px-4 py-2 rounded-lg text-sm font-medium border ${d ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`} disabled={importing}>Back</button>
                  <button
                    type="button"
                    onClick={importSelected}
                    disabled={importing || selectedRows.length === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? 'Importing...' : `Import ${selectedRows.length} transaction${selectedRows.length === 1 ? '' : 's'}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}
