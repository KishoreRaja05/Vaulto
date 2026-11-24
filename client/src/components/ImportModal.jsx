import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../services/api'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Select from './ui/Select'
import Input from './ui/Input'
import DatePicker from './ui/DatePicker'
import Badge from './ui/Badge'
import SegmentedControl from './ui/SegmentedControl'
import Icon from './ui/Icon'
import { useToast } from './ui/Toast'
import { DEFAULT_CATEGORIES } from '../utils/categories'
import {
  FIELDS, SAMPLE_CSV, buildRowsFromMatrix, buildRowsFromServer, dedupeKey, detectMapping,
  parseCsv, parseSpreadsheet, splitHeader, validateRow,
} from '../utils/importParser'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['.csv', '.xlsx', '.pdf', '.png', '.jpg', '.jpeg']
const CHUNK = 100
const PAGE_SIZE = 100
const STEPS = ['Upload', 'Map columns', 'Review', 'Done']

const ext = (name) => String(name || '').toLowerCase().slice(String(name || '').lastIndexOf('.'))
const money = (v) => `Rs. ${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function Stepper({ step, skipMap }) {
  return (
    <ol className="mb-5 flex items-center gap-2 text-xs" aria-label="Import progress">
      {STEPS.map((label, i) => {
        const done = i < step
        const current = i === step
        const skipped = skipMap && i === 1
        return (
          <li key={label} aria-current={current ? 'step' : undefined} className="flex items-center gap-2">
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
              current ? 'bg-indigo-600 text-white' : done ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : 'vl-muted-bg text-gray-400'
            }`}
            >
              {done ? <Icon name="check" size={11} strokeWidth={2.5} /> : i + 1}
            </span>
            <span className={`${current ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-400'} ${skipped ? 'line-through' : ''} hidden sm:inline`}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-gray-200 dark:bg-gray-700 sm:w-8" />}
          </li>
        )
      })}
    </ol>
  )
}

export default function ImportModal({ open, onClose, onImported, onUndone, existingTransactions = [] }) {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const wakeTimerRef = useRef(null)

  const [step, setStep] = useState(0)
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [showWakeHint, setShowWakeHint] = useState(false)
  const [sheet, setSheet] = useState(null) // { headers, rows }
  const [mapping, setMapping] = useState({})
  const [options, setOptions] = useState({ defaultType: 'expense', dateOrder: 'DMY' })
  const [rows, setRows] = useState([])
  const [warnings, setWarnings] = useState([])
  const [view, setView] = useState('all')
  const [shown, setShown] = useState(PAGE_SIZE)
  const [customCategories, setCustomCategories] = useState([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [importError, setImportError] = useState('')
  const [result, setResult] = useState(null) // { inserted, ids }
  const [undoing, setUndoing] = useState(false)
  const [serverFlow, setServerFlow] = useState(false)

  const reset = () => {
    setStep(0); setFile(null); setDragging(false); setParsing(false); setParseError('')
    setShowWakeHint(false); setSheet(null); setMapping({}); setRows([]); setWarnings([])
    setView('all'); setShown(PAGE_SIZE); setImporting(false); setProgress({ done: 0, total: 0 })
    setImportError(''); setResult(null); setUndoing(false); setServerFlow(false)
    if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
  }

  const handleClose = () => {
    if (importing || undoing) return
    onClose()
    setTimeout(reset, 200)
  }

  // Load custom categories whenever the modal opens so "unknown category" is accurate.
  useEffect(() => {
    if (!open) return undefined
    let alive = true
    Promise.all(['expense', 'income'].map((type) => api.get('/categories', { params: { type } }).catch(() => null)))
      .then((responses) => {
        if (!alive) return
        const names = responses.flatMap((r) => (Array.isArray(r?.data?.custom) ? r.data.custom.map((c) => c.name) : []))
        setCustomCategories(names)
      })
    return () => { alive = false }
  }, [open])

  const categoryList = useMemo(() => {
    const all = [...DEFAULT_CATEGORIES.expense, ...DEFAULT_CATEGORIES.income, ...customCategories, 'Other']
    return Array.from(new Map(all.map((n) => [n.toLowerCase(), n])).values())
  }, [customCategories])

  const ctx = useMemo(() => ({
    knownCategories: new Set(categoryList.map((n) => n.toLowerCase())),
    canonicalCategories: new Map(categoryList.map((n) => [n.toLowerCase(), n])),
    existingKeys: new Set(existingTransactions.map((t) => dedupeKey(String(t.date || '').slice(0, 10), t.amount, t.type, t.description))),
  }), [categoryList, existingTransactions])

  // ---------- step 0: upload ----------

  const validateFile = (candidate) => {
    if (!candidate) return 'Choose a file to upload.'
    if (!ACCEPTED.includes(ext(candidate.name))) return 'Unsupported file type. Use CSV, XLSX, PDF, PNG, JPG, or JPEG.'
    if (candidate.size > MAX_UPLOAD_BYTES) return 'File is too large. Maximum size is 5 MB.'
    return ''
  }

  const pickFile = (candidate) => {
    const error = validateFile(candidate)
    setParseError(error)
    setFile(error ? null : candidate)
  }

  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'vaulto-import-template.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const processFile = async () => {
    const error = validateFile(file)
    if (error) { setParseError(error); return }
    setParsing(true)
    setParseError('')
    try {
      const kind = ext(file.name)
      if (kind === '.csv' || kind === '.xlsx') {
        const matrix = kind === '.csv' ? parseCsv(await file.text()) : await parseSpreadsheet(await file.arrayBuffer())
        const parsed = splitHeader(matrix)
        if (!parsed.headers.length || !parsed.rows.length) {
          setParseError('No data rows found. Check that the first row contains column names.')
          return
        }
        const detected = detectMapping(parsed.headers)
        const hasNegative = detected.amount != null && parsed.rows.some((r) => String(r[detected.amount] ?? '').trim().startsWith('-'))
        setSheet(parsed)
        setMapping(detected)
        setOptions((o) => ({ ...o, defaultType: hasNegative ? 'sign' : 'expense' }))
        setServerFlow(false)
        setStep(1)
      } else {
        // PDF / image statements still go through the server parser.
        setServerFlow(true)
        wakeTimerRef.current = setTimeout(() => setShowWakeHint(true), 5000)
        const formData = new FormData()
        formData.append('file', file)
        const res = await api.post('/import/parse', formData)
        const data = res.data || {}
        setWarnings(Array.isArray(data.warnings) ? data.warnings.map(String) : [])
        setRows(buildRowsFromServer(Array.isArray(data.transactions) ? data.transactions : [], ctx))
        setShown(PAGE_SIZE)
        setStep(2)
      }
    } catch (err) {
      console.error(err)
      const message = err?.response?.data?.message || 'Could not read that file. Please check it and try again.'
      setParseError(message === 'Import service unavailable'
        ? 'Import service unavailable. PDF and image imports need the AI service running with AI_PARSE_URL and INTERNAL_API_KEY configured. CSV and XLSX imports work without it.'
        : message)
    } finally {
      if (wakeTimerRef.current) clearTimeout(wakeTimerRef.current)
      setShowWakeHint(false)
      setParsing(false)
    }
  }

  // ---------- step 1: mapping ----------

  const columnOptions = useMemo(() => [
    { value: -1, label: 'Not mapped' },
    ...(sheet?.headers || []).map((h, i) => ({ value: i, label: h })),
  ], [sheet])

  const mappingReady = mapping.date != null && (mapping.amount != null || mapping.debit != null || mapping.credit != null)

  const applyMapping = () => {
    setRows(buildRowsFromMatrix(sheet.rows, mapping, options, ctx))
    setWarnings([])
    setShown(PAGE_SIZE)
    setView('all')
    setStep(2)
  }

  // ---------- step 2: review ----------

  const updateRow = (key, patch) => setRows((prev) => prev.map((row) => {
    if (row.key !== key) return row
    const next = validateRow({ ...row, ...patch }, ctx)
    next.checked = next.errors.length ? false : (patch.checked ?? row.checked)
    return next
  }))

  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key))

  const counts = useMemo(() => {
    const attention = rows.filter((r) => r.errors.length || r.warnings.length || r.duplicate).length
    return { valid: rows.length - attention, attention, errors: rows.filter((r) => r.errors.length).length }
  }, [rows])

  const selected = useMemo(() => rows.filter((r) => r.checked && !r.errors.length), [rows])
  const selIncome = selected.filter((r) => r.type === 'income').reduce((s, r) => s + Number(r.amount), 0)
  const selExpense = selected.filter((r) => r.type === 'expense').reduce((s, r) => s + Number(r.amount), 0)

  const visibleRows = useMemo(() => {
    const list = view === 'attention' ? rows.filter((r) => r.errors.length || r.warnings.length || r.duplicate) : rows
    return list
  }, [rows, view])

  const allChecked = selected.length > 0 && rows.filter((r) => !r.errors.length).every((r) => r.checked)
  const toggleAll = () => setRows((prev) => prev.map((r) => ({ ...r, checked: r.errors.length ? false : !allChecked })))

  const fixUnknownCategories = () => setRows((prev) => prev.map((r) => (
    r.warnings.includes('Unknown category') ? validateRow({ ...r, category: 'Other' }, ctx) : r
  )).map((r, i) => ({ ...r, checked: prev[i].checked && !r.errors.length })))

  const runImport = async () => {
    if (importing || !selected.length) return
    setImporting(true)
    setImportError('')
    setProgress({ done: 0, total: selected.length })
    let before = new Set()
    try {
      before = new Set((await api.get('/transactions')).data.map((t) => t.id))
    } catch { /* undo just becomes unavailable */ }

    let inserted = 0
    try {
      for (let i = 0; i < selected.length; i += CHUNK) {
        const chunk = selected.slice(i, i + CHUNK)
        await api.post('/transactions/bulk', {
          transactions: chunk.map((r) => ({
            date: r.date, description: r.description, amount: Number(r.amount), type: r.type, category: r.category,
          })),
        })
        inserted += chunk.length
        const done = new Set(chunk.map((r) => r.key))
        setRows((prev) => prev.filter((r) => !done.has(r.key)))
        setProgress({ done: inserted, total: selected.length })
      }
    } catch (err) {
      console.error(err)
      const msg = err?.response?.data?.message || 'Could not import transactions.'
      setImportError(inserted ? `${msg} ${inserted} of ${selected.length} were imported before the error.` : msg)
      setImporting(false)
      if (inserted) onImported?.(inserted)
      return
    }

    let ids = []
    try {
      ids = (await api.get('/transactions')).data.map((t) => t.id).filter((id) => !before.has(id))
    } catch { /* ignore */ }
    setResult({ inserted, ids })
    setImporting(false)
    setStep(3)
    toast.success(`${inserted} transaction${inserted === 1 ? '' : 's'} imported.`)
    onImported?.(inserted)
  }

  // ---------- step 3: undo ----------

  const undoImport = async () => {
    if (!result?.ids.length || undoing) return
    setUndoing(true)
    let failed = 0
    const queue = [...result.ids]
    const worker = async () => {
      while (queue.length) {
        const id = queue.shift()
        try { await api.delete(`/transactions/${id}`) } catch { failed += 1 }
      }
    }
    await Promise.all(Array.from({ length: 5 }, worker))
    setUndoing(false)
    onUndone?.()
    if (failed) toast.error(`Could not remove ${failed} transaction${failed === 1 ? '' : 's'}. Delete them from the list.`)
    else toast.success('Import undone.')
    handleClose()
  }

  // ---------- render ----------

  const skipMap = serverFlow
  const title = ['Import transactions', 'Map your columns', 'Review before importing', 'Import complete'][step]
  const description = [
    'Upload a CSV, Excel file, or a statement PDF or image.',
    `${sheet?.rows.length ?? 0} rows found in ${file?.name || 'file'}. Check how columns map to Vaulto fields.`,
    'Fix anything highlighted. Only checked, valid rows are imported.',
    '',
  ][step]

  let footer
  if (step === 0) {
    footer = (
      <>
        <button type="button" onClick={downloadSample} className="vl-focus inline-flex items-center gap-1.5 rounded text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
          <Icon name="download" size={14} /> Download sample CSV template
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={processFile} loading={parsing} disabled={!file}>{parsing ? 'Reading...' : 'Continue'}</Button>
        </div>
      </>
    )
  } else if (step === 1) {
    footer = (
      <>
        <span className="text-xs text-gray-500">{mappingReady ? 'Looks good. You can still edit rows on the next step.' : 'Map Date and Amount (or Debit / Credit) to continue.'}</span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
          <Button variant="primary" onClick={applyMapping} disabled={!mappingReady}>Preview rows</Button>
        </div>
      </>
    )
  } else if (step === 2) {
    footer = (
      <>
        <div className="tabular text-xs text-gray-500">
          <span className="font-semibold text-gray-800 dark:text-gray-200">{selected.length}</span> selected
          <span className="mx-2">|</span>Income {money(selIncome)}
          <span className="mx-2">|</span>Expenses {money(selExpense)}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={importing} onClick={() => setStep(serverFlow ? 0 : 1)}>Back</Button>
          <Button variant="primary" onClick={runImport} loading={importing} disabled={!selected.length}>
            {importing ? 'Importing...' : `Import ${selected.length} transaction${selected.length === 1 ? '' : 's'}`}
          </Button>
        </div>
      </>
    )
  } else {
    footer = (
      <>
        {result?.ids.length ? (
          <Button variant="ghost" onClick={undoImport} loading={undoing} leftIcon={<Icon name="undo" size={15} />}>Undo import</Button>
        ) : <span />}
        <Button variant="primary" onClick={handleClose} disabled={undoing}>Done</Button>
      </>
    )
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      size={step === 2 ? 'xl' : step === 1 ? 'lg' : 'md'}
      footer={footer}
      dismissable={!importing && !undoing}
    >
      <Stepper step={step} skipMap={skipMap && step >= 1} />

      {step === 0 && (
        <div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Choose a file to import"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0] || null) }}
            className={`vl-focus cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                : 'border-gray-300 bg-gray-50 hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-900'
            }`}
          >
            <input ref={fileInputRef} type="file" className="hidden" accept={ACCEPTED.join(',')} onChange={(e) => pickFile(e.target.files?.[0] || null)} />
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              <Icon name={file ? 'file' : 'upload'} size={24} />
            </div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{file ? file.name : 'Drag and drop a file, or click to browse'}</p>
            <p className="mt-1 text-xs text-gray-500">
              {file ? `${(file.size / 1024).toFixed(1)} KB. Click to choose a different file.` : 'CSV or Excel (mapped in your browser), PDF or image statements. Up to 5 MB.'}
            </p>
          </div>
          {parseError && <p role="alert" className="mt-3 text-sm text-red-500">{parseError}</p>}
          {parsing && showWakeHint && (
            <p className="mt-3 text-xs text-gray-500">Server is waking up. This takes about 30 seconds on first load.</p>
          )}
          <ul className="mt-4 space-y-1 text-xs text-gray-500">
            <li>Blank cells and values like "nan" or "null" are treated as empty.</li>
            <li>Rows that match an existing transaction (same date, amount and description) are flagged.</li>
          </ul>
        </div>
      )}

      {step === 1 && sheet && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            {FIELDS.map((f) => (
              <div key={f.key} className="grid grid-cols-[130px_1fr] items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {f.label}{f.required && <span className="text-red-500"> *</span>}
                </span>
                <Select
                  aria-label={`Column for ${f.label}`}
                  value={mapping[f.key] ?? -1}
                  options={columnOptions}
                  onChange={(v) => setMapping((m) => {
                    const next = { ...m }
                    if (v === -1) delete next[f.key]
                    else next[f.key] = v
                    return next
                  })}
                />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-gray-700 dark:text-gray-300">When the file has no income / expense column</p>
              <Select
                aria-label="Default transaction type"
                value={options.defaultType}
                onChange={(v) => setOptions((o) => ({ ...o, defaultType: v }))}
                options={[
                  { value: 'sign', label: 'Negative = expense, positive = income' },
                  { value: 'expense', label: 'Treat every row as an expense' },
                  { value: 'income', label: 'Treat every row as income' },
                ]}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-gray-700 dark:text-gray-300">Date format for 03/04/2025</p>
              <SegmentedControl
                aria-label="Date format"
                value={options.dateOrder}
                onChange={(v) => setOptions((o) => ({ ...o, dateOrder: v }))}
                options={[{ value: 'DMY', label: 'Day / Month' }, { value: 'MDY', label: 'Month / Day' }]}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-medium text-gray-700 dark:text-gray-300">First rows in your file</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900">
                    <tr>{sheet.headers.slice(0, 5).map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sheet.rows.slice(0, 3).map((r, i) => (
                      <tr key={i}>
                        {sheet.headers.slice(0, 5).map((h, c) => <td key={h} className="max-w-[140px] truncate whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-300">{String(r[c] instanceof Date ? r[c].toISOString().slice(0, 10) : r[c] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          {warnings.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="mb-1 font-semibold">Import notes</p>
              <ul className="space-y-1">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div role="status" className="tabular flex items-center gap-2 text-sm">
              <Badge tone="income">{counts.valid} valid</Badge>
              <Badge tone={counts.attention ? 'warning' : 'neutral'}>{counts.attention} need attention</Badge>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {rows.some((r) => r.warnings.includes('Unknown category')) && (
                <Button size="sm" variant="secondary" onClick={fixUnknownCategories}>Set unknown categories to Other</Button>
              )}
              <SegmentedControl
                aria-label="Row filter"
                size="sm" className="w-72"
                value={view}
                onChange={(v) => { setView(v); setShown(PAGE_SIZE) }}
                options={[{ value: 'all', label: `All ${rows.length}` }, { value: 'attention', label: 'Needs attention' }]}
              />
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-gray-800">No transactions were found in this file.</div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 dark:bg-gray-900">
                    <tr>
                      <th className="w-10 px-3 py-2.5">
                        <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all valid rows" className="accent-indigo-600" />
                      </th>
                      <th className="w-12 px-2 py-2.5 font-medium">#</th>
                      <th className="w-40 px-2 py-2.5 font-medium">Date</th>
                      <th className="min-w-[220px] px-2 py-2.5 font-medium">Description</th>
                      <th className="w-32 px-2 py-2.5 font-medium">Amount</th>
                      <th className="w-32 px-2 py-2.5 font-medium">Type</th>
                      <th className="w-44 px-2 py-2.5 font-medium">Category</th>
                      <th className="w-48 px-2 py-2.5 font-medium">Status</th>
                      <th className="w-10 px-2 py-2.5"><span className="sr-only">Remove</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {visibleRows.slice(0, shown).map((row) => {
                      const bad = row.errors.length > 0
                      const warn = !bad && (row.warnings.length > 0 || row.duplicate)
                      const catOptions = row.warnings.includes('Unknown category')
                        ? [{ value: row.category, label: `${row.category} (new)` }, ...categoryList.map((n) => ({ value: n, label: n }))]
                        : categoryList.map((n) => ({ value: n, label: n }))
                      return (
                        <tr
                          key={row.key}
                          className={bad ? 'bg-red-50/70 dark:bg-red-500/10' : warn ? 'bg-amber-50/60 dark:bg-amber-500/10' : ''}
                        >
                          <td className="px-3 py-2 align-top">
                            <input
                              type="checkbox"
                              checked={row.checked}
                              disabled={bad}
                              onChange={(e) => updateRow(row.key, { checked: e.target.checked })}
                              aria-label={`Import row ${row.line}`}
                              className="mt-2.5 accent-indigo-600 disabled:opacity-40"
                            />
                          </td>
                          <td className="tabular px-2 py-2 pt-3 align-top text-xs text-gray-400">{row.line}</td>
                          <td className="px-2 py-2 align-top">
                            <DatePicker aria-label={`Date, row ${row.line}`} value={row.date} onChange={(v) => updateRow(row.key, { date: v })} invalid={!row.date} className="h-9 text-xs" />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input aria-label={`Description, row ${row.line}`} value={row.description} maxLength={200} onChange={(e) => updateRow(row.key, { description: e.target.value })} className="h-9 text-xs" />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Input aria-label={`Amount, row ${row.line}`} type="number" min="0" step="0.01" value={row.amount} onChange={(e) => updateRow(row.key, { amount: e.target.value })} aria-invalid={bad && row.errors.some((m) => /amount/i.test(m)) ? true : undefined} className="tabular h-9 text-xs" />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Select aria-label={`Type, row ${row.line}`} value={row.type} onChange={(v) => updateRow(row.key, { type: v })} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} className="h-9 text-xs" />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <Select aria-label={`Category, row ${row.line}`} value={row.category} onChange={(v) => updateRow(row.key, { category: v })} options={catOptions} className="h-9 text-xs" />
                          </td>
                          <td className="px-2 py-2 align-top">
                            <div className="flex flex-wrap gap-1 pt-1.5">
                              {row.errors.map((m) => <Badge key={m} tone="expense">{m}</Badge>)}
                              {row.warnings.map((m) => <Badge key={m} tone="warning">{m}</Badge>)}
                              {row.duplicate && <Badge tone="warning">Possible duplicate</Badge>}
                              {!bad && !warn && <Badge tone="income">Ready</Badge>}
                            </div>
                          </td>
                          <td className="px-2 py-2 align-top">
                            <button type="button" onClick={() => removeRow(row.key)} aria-label={`Remove row ${row.line}`} className="vl-focus mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                              <Icon name="trash" size={15} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {visibleRows.length > shown && (
                <div className="border-t border-gray-100 p-3 text-center dark:border-gray-800">
                  <Button size="sm" variant="secondary" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                    Show {Math.min(PAGE_SIZE, visibleRows.length - shown)} more ({visibleRows.length - shown} hidden)
                  </Button>
                </div>
              )}
            </div>
          )}

          {importing && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Importing</span>
                <span className="tabular">{progress.done} / {progress.total}</span>
              </div>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} className="h-2 overflow-hidden rounded-full vl-muted-bg">
                <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-300" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}
          {importError && <p role="alert" className="mt-3 text-sm text-red-500">{importError}</p>}
        </div>
      )}

      {step === 3 && result && (
        <div className="py-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            <Icon name="check" size={28} strokeWidth={2} />
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{result.inserted} transaction{result.inserted === 1 ? '' : 's'} imported</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            They are now in your list and counted in the dashboard and analytics.
            {result.ids.length ? ' Imported by mistake? You can undo this import.' : ''}
          </p>
        </div>
      )}
    </Modal>
  )
}
