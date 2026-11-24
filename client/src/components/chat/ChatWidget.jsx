import { useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../ui/Icon'
import { usePresence, useScrollLock } from '../ui/usePopover'
import { useChat } from '../../context/ChatContext'
import ChatView from './ChatView'

function useMediaQuery(query) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

export default function ChatWidget() {
  const { newChat } = useChat()
  const [open, setOpen] = useState(false)
  const fabRef = useRef(null)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { mounted, state } = usePresence(open, 150)
  useScrollLock(open && isMobile)

  const close = () => {
    setOpen(false)
    fabRef.current?.focus()
  }

  return createPortal(
    <>
      {!open && (
        <button
          ref={fabRef}
          type="button"
          onClick={() => { newChat(); setOpen(true) }}
          aria-label="Open assistant"
          className="vl-fab vl-focus hidden h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 md:flex"
        >
          <Icon name="chat" size={24} />
        </button>
      )}

      {mounted && (
        <section
          role="dialog"
          aria-label="Vaulto assistant"
          aria-modal={isMobile || undefined}
          data-state={state}
          className="vl-chat-panel vl-card bg-white dark:bg-gray-900"
          style={{ background: 'var(--vl-surface)' }}
        >
          <ChatView variant="widget" onClose={close} />
        </section>
      )}
    </>,
    document.body
  )
}
