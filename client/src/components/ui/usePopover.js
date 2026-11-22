import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// Ref-counted body scroll lock so nested overlays (Select inside Modal) don't
// fight over document.body. Compensates for the scrollbar to avoid layout jump.
let lockCount = 0
let saved = null

export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined
    if (lockCount === 0) {
      const body = document.body
      const scrollbar = window.innerWidth - document.documentElement.clientWidth
      saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight }
      body.style.overflow = 'hidden'
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
    }
    lockCount += 1
    return () => {
      lockCount -= 1
      if (lockCount === 0 && saved) {
        document.body.style.overflow = saved.overflow
        document.body.style.paddingRight = saved.paddingRight
        saved = null
      }
    }
  }, [active])
}

// Keeps content mounted for `ms` after `open` goes false so exit animations play.
export function usePresence(open, ms = 150) {
  const [lingering, setLingering] = useState(false)
  const [prevOpen, setPrevOpen] = useState(open)
  if (prevOpen !== open) {
    setPrevOpen(open)
    setLingering(!open)
  }
  useEffect(() => {
    if (!lingering) return undefined
    const t = setTimeout(() => setLingering(false), ms)
    return () => clearTimeout(t)
  }, [lingering, ms])
  return { mounted: open || lingering, state: open ? 'open' : 'closed' }
}

// Anchors a fixed-position panel to a trigger; flips above when space is tight.
export function usePopoverPosition(open, triggerRef, { minWidth = 0, maxHeight = 320, align = 'start', matchWidth = true } = {}) {
  const [style, setStyle] = useState(null)

  const update = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 8
    const width = Math.min(Math.max(matchWidth ? rect.width : 0, minWidth), vw - margin * 2)
    let left = align === 'end' ? rect.right - width : rect.left
    left = Math.max(margin, Math.min(left, vw - width - margin))
    const below = vh - rect.bottom - margin
    const above = rect.top - margin
    const flip = below < Math.min(maxHeight, 220) && above > below
    const room = Math.max(120, Math.min(maxHeight, (flip ? above : below) - 6))
    setStyle(flip
      ? { position: 'fixed', left, width, bottom: vh - rect.top + 6, maxHeight: room }
      : { position: 'fixed', left, width, top: rect.bottom + 6, maxHeight: room })
  }, [triggerRef, minWidth, maxHeight, align, matchWidth])

  useLayoutEffect(() => {
    if (!open) return undefined
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [open, update])

  return style
}

// Close on outside pointer-down and Escape.
export function useDismiss(open, onClose, refs) {
  const cb = useRef(onClose)
  const refList = useRef(refs)
  useEffect(() => {
    cb.current = onClose
    refList.current = refs
  })
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (refList.current.some((r) => r.current?.contains(e.target))) return
      cb.current()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        cb.current()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])
}
