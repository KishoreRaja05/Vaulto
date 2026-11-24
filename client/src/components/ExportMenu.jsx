import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './ui/Icon'
import Button from './ui/Button'
import Select from './ui/Select'
import DatePicker from './ui/DatePicker'
import { useToast } from './ui/Toast'
import { useDismiss, usePopoverPosition, usePresence, useScrollLock } from './ui/usePopover'
import { exportToCSV, exportToExcel, exportToPDF, getAppliedFilterMeta, getDateBounds } from '../utils/exportTransactions'

const FORMATS = [
  { value: 'csv', label: 'CSV', hint: 'Plain text, opens anywhere', icon: 'file' },
  { value: 'xlsx', label: 'Excel', hint: 'Formatted .xlsx workbook', icon: 'table' },
  { value: 'pdf', label: 'PDF report', hint: 'Totals, categories and table', icon: 'pdf' },
]

const SCOPES = [
  { value: 'filters', label: 'Current view (filters applied)' },
  { value: 'all', label: 'All transactions' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
]

const dayOf = (t) => String(t.date || '').slice(0, 10)

/**
 * Export popover. `allTransactions` is the full list; `filteredTransactions` the
 * current table view; `filterMeta` is the existing meta for the current view.
 */
export default function ExportMenu({ allTransactions, filteredTransactions, filterMeta, triggerVariant = 'secondary' }) {
  const toast = useToast()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState('csv')
  const [scope, setScope] = useState('filters')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [busy, setBusy] = useState(false)

  const { mounted, state } = usePresence(open)
  const style = usePopoverPosition(open, triggerRef, { minWidth: 340, maxHeight: 640, align: 'end', matchWidth: false })
  useScrollLock(open)
  const close = () => { setOpen(false); triggerRef.current?.focus() }
  useDismiss(open, () => setOpen(false), [triggerRef, panelRef])

  const { rows, meta, invalidRange } = useMemo(() => {
    if (scope === 'filters') return { rows: filteredTransactions, meta: filterMeta, invalidRange: false }
    if (scope === 'all') {
      return { rows: allTransactions, meta: getAppliedFilterMeta({ totalCount: allTransactions.length, filteredCount: allTransactions.length }), invalidRange: false }
    }
    const preset = scope === 'thisMonth' ? 'thisMonth' : 'custom'
    const bounds = getDateBounds(preset, from, to)
    if (bounds.invalid) return { rows: [], meta: filterMeta, invalidRange: true }
    const subset = allTransactions.filter((t) => (!bounds.from || dayOf(t) >= bounds.from) && (!bounds.to || dayOf(t) <= bounds.to))
    return {
      rows: subset,
      meta: getAppliedFilterMeta({ datePreset: preset, fromDate: from, toDate: to, dateBounds: bounds, totalCount: allTransactions.length, filteredCount: subset.length }),
      invalidRange: false,
    }
  }, [scope, from, to, allTransactions, filteredTransactions, filterMeta])

  const count = rows.length
  const label = `Export ${count} transaction${count === 1 ? '' : 's'}`

  const run = async () => {
    if (!count || busy) return
    setBusy(true)
    try {
      if (format === 'csv') exportToCSV(rows, meta)
      else if (format === 'xlsx') await exportToExcel(rows, meta)
      else exportToPDF(rows, meta)
      toast.success(`Exported ${count} transaction${count === 1 ? '' : 's'} as ${FORMATS.find((f) => f.value === format).label}.`)
      setOpen(false)
    } catch (err) {
      console.error(err)
      toast.error('Could not generate the export. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant={triggerVariant}
        size={triggerVariant === 'seg' ? 'fill' : 'md'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={`Export ${filteredTransactions.length} in current view`}
        leftIcon={<Icon name="download" size={16} />}
      >
        Export
        <Icon name="chevronDown" size={14} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </Button>

      {mounted && style && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Export transactions"
          data-state={state}
          style={{ ...style, zIndex: 200, overflowY: 'auto' }}
          className="vl-pop vl-panel p-4"
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Format</p>
          <div role="radiogroup" aria-label="Export format" className="mb-4 space-y-1">
            {FORMATS.map((f) => {
              const sel = f.value === format
              return (
                <button
                  key={f.value}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setFormat(f.value)}
                  className={`vl-focus flex w-full items-center gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors ${
                    sel
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                >
                  <Icon name={f.icon} size={18} className={sel ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-400'} />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{f.label}</span>
                    <span className="block text-xs text-gray-500">{f.hint}</span>
                  </span>
                  {sel && <Icon name="check" size={16} className="text-indigo-600 dark:text-indigo-300" />}
                </button>
              )
            })}
          </div>

          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Scope</p>
          <Select aria-label="Export scope" value={scope} onChange={setScope} options={SCOPES} />
          {scope === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <DatePicker aria-label="Export start date" placeholder="Start" value={from} onChange={setFrom} max={to || undefined} />
              <DatePicker aria-label="Export end date" placeholder="End" value={to} onChange={setTo} min={from || undefined} />
            </div>
          )}
          {invalidRange && <p className="mt-2 text-xs text-red-500">Start date must be on or before end date.</p>}

          <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
            <Button variant="ghost" size="sm" onClick={close}>Cancel</Button>
            <Button variant="primary" onClick={run} loading={busy} disabled={!count || invalidRange}>
              {count ? label : 'Nothing to export'}
            </Button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
