import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { useDismiss, usePopoverPosition, usePresence, useScrollLock } from './usePopover'

import { toYmd, parseYmd, formatYmd } from './dateUtils'
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

/** Single-date picker. value / onChange use 'YYYY-MM-DD'. */
export default function DatePicker({ value, onChange, min, max, placeholder = 'Select date', 'aria-label': ariaLabel, label, invalid, className = '', clearable = false }) {
  const uid = useId()
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const gridRef = useRef(null)
  const selected = parseYmd(value)
  const today = new Date()

  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => selected || today)
  const [focusDay, setFocusDay] = useState(() => selected || today)

  const { mounted, state } = usePresence(open)
  const style = usePopoverPosition(open, triggerRef, { minWidth: 288, maxHeight: 420 })
  useScrollLock(open)
  const close = (refocus = true) => {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }
  useDismiss(open, () => close(false), [triggerRef, panelRef])

  const openPicker = () => {
    const base = selected || today
    setView(base)
    setFocusDay(base)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return undefined
    const f = requestAnimationFrame(() => gridRef.current?.querySelector('[data-focus="true"]')?.focus())
    return () => cancelAnimationFrame(f)
  }, [open, focusDay, style])

  const minD = parseYmd(min)
  const maxD = parseYmd(max)
  const disabledDay = (d) => (minD && toYmd(d) < toYmd(minD)) || (maxD && toYmd(d) > toYmd(maxD))

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const lead = (first.getDay() + 6) % 7
    const daysIn = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
    const out = []
    for (let i = 0; i < lead; i += 1) out.push(null)
    for (let d = 1; d <= daysIn; d += 1) out.push(new Date(view.getFullYear(), view.getMonth(), d))
    return out
  }, [view])

  const shiftMonth = (delta) => setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1))

  const pick = (d) => {
    if (disabledDay(d)) return
    onChange?.(toYmd(d))
    close(true)
  }

  const moveFocus = (days) => {
    const next = new Date(focusDay.getFullYear(), focusDay.getMonth(), focusDay.getDate() + days)
    setFocusDay(next)
    setView(new Date(next.getFullYear(), next.getMonth(), 1))
  }

  const onGridKey = (e) => {
    const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (map[e.key]) { e.preventDefault(); moveFocus(map[e.key]) }
    else if (e.key === 'PageUp') { e.preventDefault(); shiftMonth(-1); setFocusDay(new Date(view.getFullYear(), view.getMonth() - 1, 1)) }
    else if (e.key === 'PageDown') { e.preventDefault(); shiftMonth(1); setFocusDay(new Date(view.getFullYear(), view.getMonth() + 1, 1)) }
  }

  const monthLabel = view.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const navBtn = 'vl-focus flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel || (label ? `${label}: ${selected ? formatYmd(value) : placeholder}` : undefined)}
        onClick={() => (open ? close(false) : openPicker())}
        className={`vl-control flex items-center gap-2 px-3 text-left ${className}`}
      >
        <Icon name="calendar" size={15} className="shrink-0 text-gray-400" />
        <span className={`flex-1 truncate tabular ${selected ? '' : 'text-gray-400'}`}>{selected ? formatYmd(value) : placeholder}</span>
        {clearable && selected && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear date"
            onClick={(e) => { e.stopPropagation(); onChange?.('') }}
            className="text-gray-400 hover:text-gray-600"
          >
            <Icon name="x" size={13} />
          </span>
        )}
      </button>

      {mounted && style && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Choose date"
          data-state={state}
          style={{ ...style, zIndex: 200, overflow: 'auto' }}
          className="vl-pop vl-panel p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)} className={navBtn}><Icon name="chevronLeft" size={16} /></button>
            <span id={`${uid}-m`} aria-live="polite" className="text-sm font-semibold text-gray-900 dark:text-white">{monthLabel}</span>
            <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)} className={navBtn}><Icon name="chevronRight" size={16} /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-medium text-gray-400">
            {WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}
          </div>
          <div ref={gridRef} role="grid" aria-labelledby={`${uid}-m`} onKeyDown={onGridKey} className="grid grid-cols-7 gap-y-0.5">
            {cells.map((d, i) => {
              if (!d) return <span key={`b${i}`} />
              const ymd = toYmd(d)
              const isSel = selected && ymd === toYmd(selected)
              const isToday = ymd === toYmd(today)
              const isFocus = ymd === toYmd(focusDay)
              const off = disabledDay(d)
              return (
                <button
                  key={ymd}
                  type="button"
                  role="gridcell"
                  data-focus={isFocus}
                  tabIndex={isFocus ? 0 : -1}
                  aria-selected={Boolean(isSel)}
                  aria-label={d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  disabled={off}
                  onClick={() => pick(d)}
                  className={`vl-focus mx-auto flex h-9 w-9 items-center justify-center rounded-lg text-sm tabular transition-colors disabled:opacity-30 ${
                    isSel
                      ? 'bg-indigo-600 font-semibold text-white'
                      : isToday
                        ? 'border border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-500/50 dark:text-indigo-300 dark:hover:bg-indigo-500/15'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                  }`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
            <button type="button" onClick={() => pick(new Date())} className="vl-focus rounded px-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Today</button>
            <button type="button" onClick={() => close(true)} className="vl-focus rounded px-1 text-xs text-gray-500 hover:text-gray-700">Close</button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
