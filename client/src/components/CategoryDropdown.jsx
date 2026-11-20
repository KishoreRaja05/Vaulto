import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Custom listbox replacement for the category <select>. The popover is
// portaled to document.body with fixed positioning so it is never clipped by
// the add/edit modal's overflow. Custom rows expose a delete button; defaults
// never do. Delete clicks are stopped so they cannot select the category.
export default function CategoryDropdown({
  dark,
  defaults = [],
  custom = [],
  value,
  extraName = null,
  disabled = false,
  onSelect,
  onDelete,
  otherValue = '__other__',
}) {
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)
  const optionRefs = useRef({})
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 })
  const [activeIndex, setActiveIndex] = useState(0)

  const groups = useMemo(() => {
    const seen = new Set()
    const defaultOptions = defaults.map((name) => {
      seen.add(String(name).toLowerCase())
      return { key: `d:${name}`, name, kind: 'default' }
    })

    const customOptions = []
    custom.forEach((item) => {
      const key = String(item.name).toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      customOptions.push({ key: `c:${item.id || item.name}`, name: item.name, kind: 'custom', item })
    })

    // A transaction may still use a category that was deleted from the account.
    // Keep it visible/selected without offering a delete action (it has no id).
    const extraOptions = []
    if (extraName && !seen.has(String(extraName).toLowerCase())) {
      extraOptions.push({ key: `e:${extraName}`, name: extraName, kind: 'extra' })
    }

    return [
      { label: null, options: defaultOptions },
      { label: 'Your categories', options: [...customOptions, ...extraOptions] },
      { label: null, options: [{ key: 'other', name: 'Other (add new)', kind: 'other' }] },
    ]
  }, [defaults, custom, extraName])

  const flatOptions = useMemo(() => groups.flatMap((group) => group.options), [groups])

  const close = () => setOpen(false)

  const openPopover = () => {
    if (disabled) return
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return

    const estimated = Math.min(320, Math.max(160, flatOptions.length * 42 + 52))
    const spaceBelow = window.innerHeight - rect.bottom
    const above = spaceBelow < estimated + 16 && rect.top > spaceBelow
    const maxHeight = above
      ? Math.min(estimated, Math.max(120, rect.top - 16))
      : Math.min(estimated, Math.max(120, spaceBelow - 16))
    const top = above ? Math.max(8, rect.top - maxHeight - 6) : rect.bottom + 6
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))

    setPos({ top, left, width: rect.width, maxHeight })
    const selected = flatOptions.findIndex(
      (option) => (option.kind === 'other' ? otherValue : option.name) === value
    )
    setActiveIndex(selected >= 0 ? selected : 0)
    setOpen(true)
  }

  const choose = (option) => {
    setOpen(false)
    onSelect(option.kind === 'other' ? otherValue : option.name)
  }

  // Outside click, viewport changes and scrolling would detach a fixed
  // popover, so close it in those cases.
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return
      close()
    }
    // Highlighting a selected option scrolls inside the popover; that scroll
    // must not be mistaken for the page moving away from the anchored button.
    const onScroll = (event) => {
      if (popoverRef.current?.contains(event.target)) return
      close()
    }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const onKeyDown = (event) => {
    if (disabled) return
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        openPopover()
        return
      }
      if (!flatOptions.length) return
      setActiveIndex((current) => {
        const step = event.key === 'ArrowDown' ? 1 : -1
        return (current + step + flatOptions.length) % flatOptions.length
      })
      return
    }
    if (open && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault()
      const option = flatOptions[activeIndex]
      if (option) choose(option)
    }
  }

  const buttonBg = dark ? '#1f2937' : '#ffffff'
  const buttonBorder = dark ? '#374151' : '#d1d5db'
  const buttonText = dark ? '#f9fafb' : '#111827'
  const popoverBg = dark ? '#111827' : '#ffffff'
  const popoverBorder = dark ? '#374151' : '#e5e7eb'
  const popoverText = dark ? '#e5e7eb' : '#374151'
  const displayValue = value === otherValue ? 'Other (add new)' : (value || 'Select a category')

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Category"
        onClick={() => { if (open) close(); else openPopover() }}
        onKeyDown={onKeyDown}
        style={{
          width: '100%', padding: '10px 14px', border: `1px solid ${buttonBorder}`, borderRadius: '8px',
          fontSize: '14px', background: buttonBg, color: buttonText, outline: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
          boxSizing: 'border-box',
        }}
      >
        <span className="truncate text-left">{displayValue}</span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', color: '#9ca3af' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && createPortal(
        <>
          <style>{`
            .vaulto-cat-delete { opacity: 0; transition: opacity 0.15s ease; }
            .vaulto-cat-option:hover .vaulto-cat-delete,
            .vaulto-cat-option:focus-within .vaulto-cat-delete { opacity: 1; }
            @media (hover: none) { .vaulto-cat-delete { opacity: 1; } }
          `}</style>
          <div
            ref={popoverRef}
            role="listbox"
            aria-label="Categories"
            style={{
              position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
              maxHeight: pos.maxHeight, overflowY: 'auto', zIndex: 70,
              borderRadius: '10px', border: `1px solid ${popoverBorder}`,
              background: popoverBg, boxShadow: '0 20px 45px rgba(0,0,0,0.22)',
              padding: '6px', boxSizing: 'border-box',
            }}
          >
            {groups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {group.label && (
                  <div style={{
                    padding: '8px 10px 4px', fontSize: '10px', fontWeight: 600,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: dark ? '#6b7280' : '#9ca3af',
                  }}>
                    {group.label}
                  </div>
                )}
                {group.options.map((option) => {
                  const index = flatOptions.indexOf(option)
                  const selected = (option.kind === 'other' ? otherValue : option.name) === value
                  const highlighted = index === activeIndex
                  return (
                    <div
                      key={option.key}
                      ref={(element) => { optionRefs.current[index] = element }}
                      role="option"
                      aria-selected={selected}
                      className="vaulto-cat-option"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => choose(option)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                        padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                        background: highlighted ? (dark ? '#1f2937' : '#eef2ff') : 'transparent',
                        color: highlighted && !dark ? '#4338ca' : popoverText,
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      <span className="truncate" style={{ fontSize: '13px' }}>{option.name}</span>
                      {option.kind === 'custom' && (
                        <button
                          type="button"
                          className="vaulto-cat-delete"
                          aria-label={`Delete ${option.name}`}
                          title={`Delete ${option.name}`}
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation()
                            close()
                            onDelete(option.item)
                          }}
                          style={{
                            width: '24px', height: '24px', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '6px', border: 'none', background: 'transparent',
                            color: '#ef4444', cursor: 'pointer',
                          }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  )
}
