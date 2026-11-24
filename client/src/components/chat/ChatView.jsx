import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Icon from '../ui/Icon'
import Markdown from './Markdown'
import ChatHistoryOverlay from './ChatHistory'
import { useChat } from '../../context/ChatContext'
import { usePageContext } from '../../context/PageContext'
import { useTheme } from '../../context/ThemeContext'
import { PAGE_LABELS, pageFromPath } from '../../utils/chatPrompts'

const MAX_LEN = 2000
const SUGGESTIONS = [
  'How much did I spend on food this month?',
  'Add Rs 450 for lunch',
  'Will I exceed my budget?',
]

const DISCLAIMER_NOTE = 'This is general information, not financial advice. For decisions about tax, investments or loans, consult a qualified professional.'
const DISCLAIMER_SHORT = 'This is general information, not financial advice.'
const ESTIMATE_NOTE = 'This is a rough estimate from general knowledge, not Vaulto data.'

const INTENT_LABELS = {
  forecast: 'Forecast',
  predict_monthly_spending: 'Forecast',
  anomaly_check: 'Anomaly check',
  detect_anomaly: 'Anomaly check',
  transaction: 'Added transaction',
  create_transaction: 'Added transaction',
  spending_summary: 'Spending summary',
  get_spending_summary: 'Spending summary',
}

function splitAssistantContent(content) {
  const text = String(content ?? '').replace(/\r\n/g, '\n').trimEnd()
  for (const note of [DISCLAIMER_NOTE, DISCLAIMER_SHORT, ESTIMATE_NOTE]) {
    if (text.endsWith(note)) {
      return { body: text.slice(0, -note.length).trimEnd(), note }
    }
  }
  return { body: text, note: null }
}

function extractGeneralLabel(body) {
  const rest = []
  let labelled = false
  body.split('\n').forEach((line) => {
    const match = line.trim().match(/^General information:\s*(.*)$/i)
    if (match) {
      labelled = true
      if (match[1]) rest.push(match[1])
      return
    }
    rest.push(line)
  })
  return { labelled, text: rest.join('\n').trim() }
}

function TypingDots({ dark }) {
  return (
    <div className="flex h-5 items-center gap-1.5" role="status" aria-label="Assistant is typing">
      <span className={`vl-dot h-1.5 w-1.5 rounded-full ${dark ? 'bg-gray-500' : 'bg-gray-400'}`} style={{ animationDelay: '0ms' }} />
      <span className={`vl-dot h-1.5 w-1.5 rounded-full ${dark ? 'bg-gray-500' : 'bg-gray-400'}`} style={{ animationDelay: '180ms' }} />
      <span className={`vl-dot h-1.5 w-1.5 rounded-full ${dark ? 'bg-gray-500' : 'bg-gray-400'}`} style={{ animationDelay: '360ms' }} />
    </div>
  )
}

export default function ChatView({ variant = 'page', onClose }) {
  const { dark } = useTheme()
  const {
    conversations,
    activeConversationId,
    messages,
    sending,
    stillWorking,
    loadingConversations,
    loadingMessages,
    openConversation,
    newChat,
    sendMessage,
    retryMessage,
    renameConversation,
    deleteConversation,
    clearAll,
  } = useChat()

  const registered = usePageContext()
  const { pathname } = useLocation()
  const [draft, setDraft] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  // A fresh, empty conversation every time this view mounts (tab, button or reload).
  // Deferred to avoid a synchronous state update inside the effect body.
  useEffect(() => {
    const raf = requestAnimationFrame(() => { newChat(); setDraft('') })
    return () => cancelAnimationFrame(raf)
  }, [newChat])

  const page = registered?.page || pageFromPath(pathname)
  const pageLabel = variant === 'widget' ? PAGE_LABELS[page] : null
  const context = useMemo(
    () => (variant === 'widget'
      ? { page, route: pathname, ...(registered || {}) }
      : { page: 'assistant', route: '/chat' }),
    [variant, page, pathname, registered]
  )

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending, stillWorking, loadingMessages])

  useEffect(() => {
    if (!historyOpen) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setHistoryOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [historyOpen])

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
    setHistoryOpen(false)
    if (inputRef.current) inputRef.current.style.height = 'auto'
    sendMessage(value, context)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
    if (e.key === 'Escape' && historyOpen) {
      e.stopPropagation()
      setHistoryOpen(false)
    }
  }

  const handleNew = () => {
    newChat()
    setDraft('')
    setHistoryOpen(false)
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  const handleOpen = (id) => {
    openConversation(id)
    setDraft('')
    setHistoryOpen(false)
  }

  const handleDelete = async (id) => {
    await deleteConversation(id)
    if (id === activeConversationId) setDraft('')
  }

  const activeTitle = conversations.find((c) => c.id === activeConversationId)?.title || 'New chat'
  const subtle = dark ? 'text-gray-500' : 'text-gray-400'
  const border = dark ? 'border-gray-800' : 'border-gray-200'

  return (
    <>
      <div className="flex h-full min-h-0 w-full flex-col">
        <header className={`flex shrink-0 items-center gap-2 border-b px-3 py-2.5 sm:px-4 ${border}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Icon name="sparkle" size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className={`truncate text-sm font-semibold sm:text-base ${dark ? 'text-white' : 'text-gray-900'}`}>{activeTitle}</h2>
            {pageLabel && <p className={`truncate text-[11px] ${subtle}`}>Viewing: {pageLabel}</p>}
          </div>
          <button
            type="button"
            onClick={handleNew}
            aria-label="New chat"
            title="New chat"
            className={`vl-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${dark ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Icon name="plus" size={18} />
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            aria-label="Open chat history"
            title="Chat history"
            aria-expanded={historyOpen}
            className={`vl-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${dark ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Icon name="clock" size={18} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            title="Close"
            className={`vl-focus flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${dark ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5" aria-live="polite">
          {loadingMessages ? (
            <div className="space-y-4">
              {[85, 70, 90, 60].map((width, i) => (
                <div key={i} className={`h-14 animate-pulse rounded-2xl ${dark ? 'bg-gray-800' : 'bg-gray-100'}`} style={{ width: `${width}%`, marginLeft: i % 2 ? 'auto' : 0 }} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-2 text-center">
              <span className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${dark ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                <Icon name="sparkle" size={22} />
              </span>
              <p className={`mb-1 text-sm font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>How can I help with your finances?</p>
              <p className={`mb-5 text-xs ${subtle}`}>Try one of these to get started.</p>
              <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                {SUGGESTIONS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submit(prompt)}
                    disabled={sending}
                    className={`vl-focus rounded-xl border px-3 py-2.5 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:py-2 ${
                      dark
                        ? 'border-gray-700 text-gray-300 hover:border-indigo-500 hover:text-indigo-300'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700'
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => {
                const isUser = m.role === 'user'
                const intentLabel = m.intent ? (INTENT_LABELS[m.intent] || m.intent) : null
                const split = isUser || m.failed
                  ? { labelled: false, text: m.content, note: null }
                  : (() => {
                    const { body, note } = splitAssistantContent(m.content)
                    return { ...extractGeneralLabel(body), note }
                  })()
                return (
                  <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`min-w-0 ${
                      isUser
                        ? 'max-w-[85%] sm:max-w-[520px] lg:max-w-[560px]'
                        : 'w-full max-w-[92%] lg:max-w-[720px]'
                    }`}>
                      <div className={`break-words px-4 py-2.5 text-sm leading-relaxed ${
                        isUser || m.failed ? 'whitespace-pre-wrap' : ''
                      } ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
                          : m.failed
                            ? dark
                              ? 'bg-red-950/40 text-red-300 border border-red-900/60 rounded-2xl rounded-bl-md'
                              : 'bg-red-50 text-red-700 border border-red-200 rounded-2xl rounded-bl-md'
                            : dark
                              ? 'bg-gray-800 text-gray-100 border border-gray-700 rounded-2xl rounded-bl-md'
                              : 'bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl rounded-bl-md'
                      } ${m.pending ? 'opacity-70' : ''}`}>
                        {isUser || m.failed ? (
                          m.content
                        ) : (
                          <>
                            {split.labelled && (
                              <p className={`mb-2 text-[11px] font-medium tracking-wide ${subtle}`}>General information:</p>
                            )}
                            {split.text && <Markdown>{split.text}</Markdown>}
                            {split.note && (
                              <p className={`mt-3 border-t pt-2 text-[11px] leading-relaxed ${dark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                {split.note}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      {!isUser && intentLabel && !m.failed && (
                        <div className="mt-1.5 px-1">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${dark ? 'border-gray-700 bg-gray-800/60 text-gray-400' : 'border-gray-200 bg-white text-gray-500'}`}>
                            {intentLabel}
                          </span>
                        </div>
                      )}
                      {isUser && m.failed && (
                        <div className="mt-1.5 flex items-center justify-end gap-2 px-1">
                          <span className={`text-[11px] ${dark ? 'text-red-300/80' : 'text-red-500'}`}>{m.error || 'Message failed.'}</span>
                          <button
                            type="button"
                            onClick={() => retryMessage(m.id)}
                            className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${dark ? 'border-gray-700 text-gray-300 hover:border-indigo-500 hover:text-indigo-300' : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'}`}
                          >
                            Retry
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {sending && (
                <div className="flex justify-start">
                  <div className={`rounded-2xl rounded-bl-md border px-4 py-3 ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                    <TypingDots dark={dark} />
                    {stillWorking && (
                      <p className={`mt-2 text-[11px] ${dark ? 'text-amber-300' : 'text-amber-600'}`}>
                        Server is waking up, this can take about 30 seconds
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className={`shrink-0 border-t px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 ${border}`}>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); resize() }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your spending, add a transaction, or ask a finance question..."
              rows={1}
              maxLength={MAX_LEN}
              aria-label="Message the assistant"
              className={`min-w-0 max-h-[120px] flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors duration-150 ${
                dark
                  ? 'bg-gray-950 border-gray-700 text-gray-100 placeholder:text-gray-600 focus:border-indigo-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500'
              }`}
              style={{ minHeight: '44px', maxHeight: '120px', height: 'auto' }}
            />
            <button
              type="button"
              onClick={() => submit()}
              disabled={!draft.trim() || sending}
              aria-label="Send message"
              className="vl-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="send" size={17} />
            </button>
          </div>
          <p className={`mt-2 hidden text-[11px] sm:block ${subtle}`}>Enter to send, Shift+Enter for a new line</p>
        </div>
      </div>

      <ChatHistoryOverlay
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        dark={dark}
        conversations={conversations}
        activeConversationId={activeConversationId}
        loading={loadingConversations}
        onNewChat={handleNew}
        onOpen={handleOpen}
        onRename={renameConversation}
        onDelete={handleDelete}
        onClearAll={clearAll}
      />
    </>
  )
}
