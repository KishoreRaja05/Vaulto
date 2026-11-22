import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '../ui/Icon'
import { useScrollLock, usePresence } from '../ui/usePopover'
import { useChat } from '../../context/ChatContext'
import { usePageContext } from '../../context/PageContext'
import { PAGE_LABELS, PAGE_PROMPTS, pageFromPath } from '../../utils/chatPrompts'
import Markdown from './Markdown'

const OPEN_KEY = 'vaulto_chat_widget_open'
const DRAFT_KEY = 'vaulto_chat_widget_draft'
const MAX_LEN = 2000

const readStorage = (key, fallback) => {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
const writeStorage = (key, value) => {
  try { localStorage.setItem(key, value) } catch { /* storage unavailable: state stays in memory */ }
}

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

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-2" role="status" aria-label="Assistant is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="vl-dot h-1.5 w-1.5 rounded-full bg-gray-400" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  )
}

export default function ChatWidget() {
  const { messages, sending, stillWorking, loadingMessages, sendMessage, retryMessage, newChat } = useChat()
  const registered = usePageContext()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 639px)')

  const [open, setOpen] = useState(() => readStorage(OPEN_KEY, '0') === '1')
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState(() => readStorage(DRAFT_KEY, ''))
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const fabRef = useRef(null)

  const { mounted, state } = usePresence(open, 150)
  useScrollLock(open && isMobile)

  const page = registered?.page || pageFromPath(pathname)
  const pageLabel = PAGE_LABELS[page]
  const prompts = PAGE_PROMPTS[page] || PAGE_PROMPTS.default
  const context = useMemo(() => ({ page, route: pathname, ...(registered || {}) }), [page, pathname, registered])

  const setOpenPersist = (value) => {
    setOpen(value)
    writeStorage(OPEN_KEY, value ? '1' : '0')
  }

  useEffect(() => { writeStorage(DRAFT_KEY, draft) }, [draft])

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending, open])

  useEffect(() => {
    if (!open) return undefined
    const f = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(f)
  }, [open])

  const resize = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const submit = (text) => {
    const value = (text ?? draft).trim()
    if (!value || sending) return
    setDraft('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    sendMessage(value, context)
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
    if (e.key === 'Escape') { e.stopPropagation(); setOpenPersist(false); fabRef.current?.focus() }
  }

  const hasMessages = messages.length > 0

  return createPortal(
    <>
      {!open && (
        <button
          ref={fabRef}
          type="button"
          onClick={() => setOpenPersist(true)}
          aria-label="Open assistant"
          className="vl-fab vl-focus flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white transition-transform duration-200 hover:-translate-y-0.5 hover:bg-indigo-700"
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
          data-expanded={expanded}
          className="vl-chat-panel vl-card bg-white dark:bg-gray-900"
          style={{ background: 'var(--vl-surface)' }}
        >
          {/* Header */}
          <header className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white"><Icon name="sparkle" size={16} /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Assistant</h2>
              {pageLabel && <p className="truncate text-[11px] text-gray-400">Viewing: {pageLabel}</p>}
            </div>
            <button type="button" onClick={newChat} aria-label="New chat" title="New chat" className="vl-focus flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><Icon name="plus" size={16} /></button>
            <button type="button" onClick={() => { setOpenPersist(false); navigate('/chat') }} aria-label="Open full page" title="Open full page" className="vl-focus hidden h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 sm:flex"><Icon name="chat" size={16} /></button>
            <button type="button" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? 'Shrink panel' : 'Expand panel'} aria-pressed={expanded} title={expanded ? 'Shrink' : 'Expand'} className="vl-focus hidden h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 sm:flex"><Icon name="expand" size={16} /></button>
            <button type="button" onClick={() => { setOpenPersist(false); fabRef.current?.focus() }} aria-label="Minimize assistant" title="Minimize" className="vl-focus flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><Icon name="minimize" size={16} /></button>
          </header>

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
            {!hasMessages && !loadingMessages ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"><Icon name="sparkle" size={22} /></span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">How can I help{pageLabel ? ` with ${pageLabel.toLowerCase()}` : ''}?</p>
                <p className="mb-4 mt-1 max-w-[260px] text-xs text-gray-500">Ask about your spending, or tell me what to add. I can see which page you are on.</p>
                <div className="flex w-full flex-col gap-2">
                  {prompts.map((p) => (
                    <button key={p} type="button" onClick={() => submit(p)} disabled={sending} className="vl-focus rounded-xl border border-gray-200 px-3 py-2.5 text-left text-sm text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:border-indigo-500">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {loadingMessages && <div className="vl-skeleton h-10 w-2/3" />}
                {messages.map((m) => {
                  const isUser = m.role === 'user'
                  return (
                    <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] ${isUser ? '' : 'w-full'}`}>
                        {isUser ? (
                          <div className={`whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-indigo-600 px-3.5 py-2 text-sm text-white ${m.pending ? 'opacity-70' : ''}`}>{m.content}</div>
                        ) : (
                          <div className="rounded-2xl rounded-bl-md vl-muted-bg px-3.5 py-2.5 text-gray-800 dark:text-gray-100"><Markdown>{m.content}</Markdown></div>
                        )}
                        {m.failed && (
                          <p role="alert" className="mt-1 flex items-center justify-end gap-2 text-xs text-red-500">
                            {m.error}
                            <button type="button" onClick={() => retryMessage(m.id)} className="vl-focus rounded font-medium underline">Retry</button>
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md vl-muted-bg px-3">
                      <TypingDots />
                      {stillWorking && <p className="pb-2 text-[11px] text-gray-500">Still working. The server may be waking up.</p>}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={(e) => { e.preventDefault(); submit() }} className="shrink-0 border-t border-gray-100 p-3 dark:border-gray-800">
            {hasMessages && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {prompts.slice(0, 3).map((p) => (
                  <button key={p} type="button" onClick={() => submit(p)} disabled={sending} className="vl-focus shrink-0 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">
                    {p}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                rows={1}
                maxLength={MAX_LEN}
                onChange={(e) => { setDraft(e.target.value); resize() }}
                onKeyDown={onKeyDown}
                placeholder="Ask or add a transaction..."
                aria-label="Message the assistant"
                className="vl-control max-h-[120px] min-h-[40px] flex-1 resize-none px-3 py-2 leading-snug"
                style={{ height: 'auto' }}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label="Send message"
                className="vl-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="send" size={17} />
              </button>
            </div>
          </form>
        </section>
      )}
    </>,
    document.body
  )
}
