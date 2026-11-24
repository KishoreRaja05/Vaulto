import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import { usePresence, useScrollLock } from './usePopover'

const WIDTHS = { sm: 'max-w-[400px]', md: 'max-w-[480px]', lg: 'max-w-[720px]', xl: 'max-w-[1040px]' }
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function Modal({ open, onClose, title, description, size = 'md', footer, children, dismissable = true }) {
  const titleId = useId()
  const panelRef = useRef(null)
  const lastFocus = useRef(null)
  const onCloseRef = useRef(onClose)
  const { mounted, state } = usePresence(open, 150)
  useScrollLock(open)

  // Callers pass inline arrow functions, so `onClose` changes identity on every
  // parent render. Keep the latest callback in a ref instead of putting it in
  // the effect dependencies: re-running this effect on each keystroke would
  // restore focus to the element behind the modal and steal focus from inputs.
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    lastFocus.current = document.activeElement
    const frame = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current?.querySelector(FOCUSABLE)
      ;(first || panelRef.current)?.focus()
    })
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation()
        onCloseRef.current?.()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      lastFocus.current?.focus?.()
    }
  }, [open, dismissable])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" data-state={state}>
      <div
        data-state={state}
        onClick={() => dismissable && onCloseRef.current?.()}
        className="vl-fade absolute inset-0 bg-black/50 backdrop-blur-[4px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        data-state={state}
        className={`vl-modal vl-card relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-b-none outline-none sm:rounded-b-[16px] ${WIDTHS[size]}`}
        style={{ opacity: state === 'closed' ? 0 : undefined, transition: 'opacity 150ms' }}
      >
        {(title || description) && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 pb-4 pt-5 dark:border-gray-800">
            <div className="min-w-0">
              {title && <h2 id={titleId} className="text-[15px] font-semibold text-gray-900 dark:text-white">{title}</h2>}
              {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
            </div>
            {dismissable && (
              <button
                type="button"
                onClick={() => onCloseRef.current?.()}
                aria-label="Close"
                className="vl-focus -mr-2 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 pb-5 pt-4 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
