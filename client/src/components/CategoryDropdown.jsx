import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Searchable category combobox used by the add/edit transaction modal.
// The popover is portaled to document.body with a z-index above the modal and
// fixed positioning so it is never clipped or covered by the modal overlay.
// Typing filters every option; a "Create ..." row saves a brand new category
// to the user's account through the categories API.
export default function CategoryDropdown({
  dark,
  defaults = [],
  custom = [],
  value,
  extraName = null,
  disabled = false,
  onSelect,
  onDelete,
  onCreate,
  maxLength = 30,
}) {
  const buttonRef = useRef(null)
  const popoverRef = useRef(null)
  const searchRef = useRef(null)
  const optionRefs = useRef({})
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 280 })
  const [activeIndex, setActiveIndex] = useState(0)
  const [creating, setCreating] = useState(false)
  const [adding, setAdding] = useState(false)

  const baseGroups = useMemo(() => {
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
    ]
  }, [defaults, custom, extraName])

  const allOptions = useMemo(() => baseGroups.flatMap((group) => group.options), [baseGroups])
  const trimmedQuery = query.trim()
  const needle = trimmedQuery.toLowerCase()

  const groups = useMemo(() => {
    if (!needle) return baseGroups

    const filtered = baseGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => option.name.toLowerCase().includes(needle)),
      }))
      .filter((group) => group.options.length > 0)

    const exact = allOptions.some((option) => option.name.toLowerCase() === needle)
    const createOptions = !exact && trimmedQuery && onCreate
      ? [{ key: `create:${needle}`, name: `Create "${trimmedQuery}"`, kind: 'create', value: trimmedQuery }]
      : []

    return [...filtered, { label: null, options: createOptions }]
  }, [baseGroups, allOptions, needle, trimmedQuery, onCreate])

  const flatOptions = useMemo(() => groups.flatMap((group) => group.options), [groups])

  const close = () => setOpen(false)

  const openPopover = () => {
    if (disabled) return
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return

    const estimated = Math.min(320, Math.max(180, Math.min(allOptions.length, 8) * 42 + 92))
    const spaceBelow = window.innerHeight - rect.bottom
    const above = spaceBelow < estimated + 16 && rect.top > spaceBelow
    const maxHeight = above
      ? Math.min(estimated, Math.max(140, rect.top - 16))
      : Math.min(estimated, Math.max(140, spaceBelow - 16))
    const top = above ? Math.max(8, rect.top - maxHeight - 6) : rect.bottom + 6
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))

    setPos({ top, left, width: rect.width, maxHeight })
    setQuery('')
    setActiveIndex(0)
    setAdding(false)
    setOpen(true)
  }

  const saveNewCategory = async (rawName) => {
    const name = String(rawName || '').trim()
    if (!name || !onCreate || creating) return
    setCreating(true)
    try {
      const savedName = await onCreate(name)
      if (savedName) {
        setAdding(false)
        setQuery('')
        close()
        onSelect(savedName)
      }
    } finally {
      setCreating(false)
    }
  }

  const startAdding = () => {
    setQuery('')
    setAdding(true)
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  const cancelAdding = () => {
    setQuery('')
    setAdding(false)
    requestAnimationFrame(() => buttonRef.current?.focus())
  }

  const choose = async (option) => {
    if (!option) return
    if (option.kind === 'create') {
      await saveNewCategory(option.value)
      return
    }
    close()
    onSelect(option.name)
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
    if (!open) return undefined
    const frame = requestAnimationFrame(() => searchRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, flatOptions])

  const onSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (adding) cancelAdding()
      else close()
      return
    }
    if (adding) {
      if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        saveNewCategory(query)
      }
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!flatOptions.length) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => (current + step + flatOptions.length) % flatOptions.length)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      choose(flatOptions[activeIndex] || flatOptions[0])
    }
  }

  const onTriggerKeyDown = (event) => {
    if (disabled) return
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      openPopover()
    }
  }

  const buttonBg = dark ? '#1f2937' : '#ffffff'
  const buttonBorder = dark ? '#374151' : '#d1d5db'
  const buttonText = dark ? '#f9fafb' : '#111827'
  const popoverBg = dark ? '#111827' : '#ffffff'
  const popoverBorder = dark ? '#374151' : '#e5e7eb'
  const popoverText = dark ? '#e5e7eb' : '#374151'
  const displayValue = value || 'Select a category'

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
        onKeyDown={onTriggerKeyDown}
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
            style={{
              position: 'fixed', top: pos.top, left: pos.left, width: pos.width,
              maxHeight: pos.maxHeight, display: 'flex', flexDirection: 'column',
              zIndex: 300, borderRadius: '10px', border: `1px solid ${popoverBorder}`,
              background: popoverBg, boxShadow: '0 20px 45px rgba(0,0,0,0.22)',
              padding: '6px', boxSizing: 'border-box',
            }}
          >
            <input
              ref={searchRef}
              value={query}
              maxLength={maxLength}
              disabled={creating}
              onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }}
              onKeyDown={onSearchKeyDown}
              placeholder={adding ? 'e.g. Gym, Rent, Pet care' : 'Search categories or type a new name'}
              aria-label={adding ? 'New category name' : 'Search or create a category'}
              role="combobox"
              aria-expanded="true"
              aria-controls="vaulto-category-list"
              aria-activedescendant={!adding && flatOptions[activeIndex] ? `vaulto-category-option-${activeIndex}` : undefined}
              style={{
                width: '100%', padding: '8px 10px', marginBottom: '4px',
                border: `1px solid ${popoverBorder}`, borderRadius: '8px',
                background: dark ? '#1f2937' : '#f9fafb',
                color: popoverText, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
              }}
            />
            {!adding && (
            <div
              id="vaulto-category-list"
              role="listbox"
              aria-label="Categories"
              style={{ overflowY: 'auto', minHeight: 0 }}
            >
              {flatOptions.length === 0 && (
                <div style={{ padding: '10px', fontSize: '12px', color: dark ? '#6b7280' : '#9ca3af' }}>
                  No matches. Type a name to create a category.
                </div>
              )}
              {groups.map((group, groupIndex) => (
                <div key={group.label || `group-${groupIndex}`}>
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
                    const selected = option.name === value
                    const highlighted = index === activeIndex
                    return (
                      <div
                        key={option.key}
                        id={`vaulto-category-option-${index}`}
                        ref={(element) => { optionRefs.current[index] = element }}
                        role="option"
                        aria-selected={selected}
                        className="vaulto-cat-option"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => choose(option)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                          padding: '9px 10px', borderRadius: '8px', cursor: creating ? 'wait' : 'pointer',
                          background: highlighted ? (dark ? '#1f2937' : '#eef2ff') : 'transparent',
                          color: highlighted && !dark ? '#4338ca' : popoverText,
                          fontWeight: selected ? 600 : 400,
                        }}
                      >
                        <span className="truncate" style={{ fontSize: '13px' }}>{option.name}</span>
                        {option.kind === 'create' && (
                          <span style={{ fontSize: '11px', color: '#6366f1', flexShrink: 0 }}>
                            {creating ? 'Saving...' : 'New'}
                          </span>
                        )}
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
            )}

            {adding ? (
              <div style={{
                marginTop: '4px', paddingTop: '6px', borderTop: `1px solid ${popoverBorder}`,
              }}>
                <p style={{
                  margin: '0 0 6px', fontSize: '11px',
                  color: dark ? '#9ca3af' : '#6b7280',
                }}>
                  Saved to your account when you click Save.
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={cancelAdding}
                    disabled={creating}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '8px',
                      border: `1px solid ${popoverBorder}`, background: 'transparent',
                      color: popoverText, fontSize: '13px', cursor: creating ? 'wait' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => saveNewCategory(query)}
                    disabled={!query.trim() || creating}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: '8px', border: 'none',
                      background: '#4f46e5', color: '#ffffff', fontSize: '13px', fontWeight: 600,
                      cursor: !query.trim() || creating ? 'not-allowed' : 'pointer',
                      opacity: !query.trim() || creating ? 0.6 : 1,
                    }}
                  >
                    {creating ? 'Saving...' : 'Save category'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={startAdding}
                disabled={disabled || !onCreate}
                style={{
                  width: '100%', marginTop: '4px', padding: '9px 10px', borderRadius: '8px',
                  border: `1px dashed ${popoverBorder}`, background: 'transparent',
                  color: dark ? '#a5b4fc' : '#4f46e5', fontSize: '13px', fontWeight: 600,
                  cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left',
                }}
              >
                + Add new category
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  )
}
