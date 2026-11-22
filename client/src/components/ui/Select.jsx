import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { useDismiss, usePopoverPosition, usePresence, useScrollLock } from './usePopover'

/**
 * Accessible custom listbox.
 * options: [{ value, label, icon?: ReactNode, color?: '#hex', hint?: string, disabled? }]
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select',
  label,
  'aria-label': ariaLabel,
  leadingIcon,
  disabled = false,
  searchable,
  searchPlaceholder = 'Search',
  invalid = false,
  className = '',
  align = 'start',
  minPanelWidth = 180,
  id,
}) {
  const uid = useId()
  const listId = `${uid}-list`
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const listRef = useRef(null)
  const typeahead = useRef({ text: '', t: 0 })

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const showSearch = searchable ?? options.length > 8
  const selected = options.find((o) => o.value === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => String(o.label).toLowerCase().includes(q)) : options
  }, [options, query])

  const { mounted, state } = usePresence(open)
  const style = usePopoverPosition(open, triggerRef, { minWidth: minPanelWidth, align })
  useScrollLock(open)

  const close = (refocus = true) => {
    setOpen(false)
    setQuery('')
    if (refocus) triggerRef.current?.focus()
  }
  useDismiss(open, () => close(false), [triggerRef, panelRef])

  const openList = () => {
    if (disabled) return
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setQuery('')
    setOpen(true)
  }

  // Focus the search box (or the list) once the panel exists.
  useEffect(() => {
    if (!open) return undefined
    const t = requestAnimationFrame(() => (showSearch ? searchRef.current : listRef.current)?.focus())
    return () => cancelAnimationFrame(t)
  }, [open, showSearch, style])

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, filtered])

  const choose = (opt) => {
    if (!opt || opt.disabled) return
    onChange?.(opt.value, opt)
    close(true)
  }

  const move = (delta) => {
    if (!filtered.length) return
    let next = active
    for (let i = 0; i < filtered.length; i += 1) {
      next = (next + delta + filtered.length) % filtered.length
      if (!filtered[next].disabled) break
    }
    setActive(next)
  }

  const onListKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(Math.max(0, filtered.length - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(filtered[active]) }
    else if (e.key === 'Tab') close(false)
    else if (!showSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Type-ahead: accumulate characters typed within 600ms.
      const now = Date.now()
      const ta = typeahead.current
      ta.text = now - ta.t > 600 ? e.key.toLowerCase() : ta.text + e.key.toLowerCase()
      ta.t = now
      const hit = filtered.findIndex((o) => String(o.label).toLowerCase().startsWith(ta.text))
      if (hit >= 0) setActive(hit)
    }
  }

  const onTriggerKey = (e) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault()
      openList()
    }
  }

  const activeId = filtered[active] ? `${uid}-opt-${active}` : undefined

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel || (label ? `${label}: ${selected?.label ?? placeholder}` : undefined)}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onTriggerKey}
        className={`vl-control flex items-center gap-2 px-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {leadingIcon && <span className="shrink-0 text-gray-400">{leadingIcon}</span>}
        {selected?.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: selected.color }} />}
        {selected?.icon && <span className="shrink-0 text-gray-400">{selected.icon}</span>}
        <span className={`flex-1 truncate ${selected ? '' : 'text-gray-400'}`}>{selected ? selected.label : placeholder}</span>
        <Icon name="chevronDown" size={14} className={`shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {mounted && style && createPortal(
        <div
          ref={panelRef}
          data-state={state}
          style={{ ...style, zIndex: 200 }}
          className="vl-pop vl-panel flex flex-col overflow-hidden"
        >
          {showSearch && (
            <div className="relative border-b border-gray-100 p-2 dark:border-gray-800">
              <Icon name="search" size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActive(0) }}
                onKeyDown={onListKey}
                placeholder={searchPlaceholder}
                aria-label="Filter options"
                aria-controls={listId}
                aria-activedescendant={activeId}
                className="h-8 w-full rounded-md border border-gray-200 bg-white pl-8 pr-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>
          )}
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={showSearch ? -1 : 0}
            aria-label={ariaLabel || label}
            aria-activedescendant={activeId}
            onKeyDown={onListKey}
            className="overflow-y-auto p-1 outline-none"
          >
            {filtered.length === 0 && <li className="px-3 py-3 text-sm text-gray-400">No matches</li>}
            {filtered.map((opt, i) => {
              const isSel = opt.value === value
              const isActive = i === active
              return (
                <li
                  key={String(opt.value)}
                  id={`${uid}-opt-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={isSel}
                  aria-disabled={opt.disabled || undefined}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(opt)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                    opt.disabled ? 'opacity-40' : ''
                  } ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/15' : ''} ${
                    isSel ? 'font-medium text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {opt.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: opt.color }} />}
                  {opt.icon && <span className="shrink-0 text-gray-400">{opt.icon}</span>}
                  <span className="flex-1 truncate">{opt.label}</span>
                  {opt.hint && <span className="text-xs text-gray-400">{opt.hint}</span>}
                  {isSel && <Icon name="check" size={14} className="shrink-0 text-indigo-600 dark:text-indigo-400" />}
                </li>
              )
            })}
          </ul>
        </div>,
        document.body
      )}
    </>
  )
}
