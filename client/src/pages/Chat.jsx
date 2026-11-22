import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import AppNav from '../components/AppNav'
import { useTheme } from '../context/ThemeContext'
import { useChat } from '../context/ChatContext'
import Markdown from '../components/chat/Markdown'

function PageWrapper({ children }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.45s cubic-bezier(.4,0,.2,1), transform 0.45s cubic-bezier(.4,0,.2,1)',
    }}>
      {children}
    </div>
  )
}

const SUGGESTIONS = [
  'Will I overspend this month?',
  'How much did I spend on food?',
  'Add 450 for dinner today',
]

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

function groupConversations(list) {
  const groups = { today: [], yesterday: [], previous7: [], older: [] }
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const day = 24 * 60 * 60 * 1000

  list.forEach((conversation) => {
    const time = new Date(conversation.updatedAt || conversation.createdAt || 0).getTime()
    if (time >= startToday) groups.today.push(conversation)
    else if (time >= startToday - day) groups.yesterday.push(conversation)
    else if (time >= startToday - 7 * day) groups.previous7.push(conversation)
    else groups.older.push(conversation)
  })

  return [
    ['Today', groups.today],
    ['Yesterday', groups.yesterday],
    ['Previous 7 days', groups.previous7],
    ['Older', groups.older],
  ].filter(([, items]) => items.length > 0)
}

function IconButton({ label, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${className}`}
    >
      {children}
    </button>
  )
}

function ConversationRow({ conversation, active, dark, onOpen, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(conversation.title)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const save = () => {
    const value = draft.trim()
    if (value) onRename(conversation.id, value)
    else setDraft(conversation.title)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(conversation.title)
    setEditing(false)
  }

  return (
    <div className="relative">
      {editing ? (
        <div className="flex items-center gap-1 px-1.5 py-1">
          <input
            ref={inputRef}
            value={draft}
            maxLength={80}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); save() }
              if (e.key === 'Escape') { e.preventDefault(); cancel() }
            }}
            className={`min-w-0 flex-1 rounded-md border px-2 py-1 text-xs outline-none focus:border-indigo-500 ${
              dark ? 'bg-gray-950 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          <IconButton
            label="Save name"
            onClick={save}
            className={dark ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-800' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </IconButton>
          <IconButton
            label="Cancel rename"
            onClick={cancel}
            className={dark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </IconButton>
        </div>
      ) : (
        <div className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-all duration-150 ${
          active
            ? dark ? 'bg-indigo-600/15 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
            : dark ? 'text-gray-400 hover:bg-gray-800/70 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}>
          <button
            type="button"
            onClick={() => onOpen(conversation.id)}
            className="min-w-0 flex-1 truncate text-left font-medium"
            title={conversation.title}
          >
            {conversation.title}
          </button>
          <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
            <IconButton
              label="Rename conversation"
              onClick={() => { setDraft(conversation.title); setEditing(true) }}
              className={dark ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-700/60' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-200/60'}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </IconButton>
            <IconButton
              label="Delete conversation"
              onClick={() => setConfirmDelete(true)}
              className={dark ? 'text-gray-500 hover:text-red-400 hover:bg-gray-700/60' : 'text-gray-400 hover:text-red-500 hover:bg-gray-200/60'}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </IconButton>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className={`absolute right-2 top-full z-30 mt-1 w-48 rounded-lg border p-2.5 shadow-lg ${
          dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={`text-xs mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Delete this chat?</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className={`text-[11px] px-2 py-1 rounded-md border ${dark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { setConfirmDelete(false); onDelete(conversation.id) }}
              className="text-[11px] px-2 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ConversationSidebar({ dark, conversations, activeConversationId, loading, onNewChat, onOpen, onRename, onDelete }) {
  const groups = groupConversations(conversations)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`p-3 border-b ${dark ? 'border-gray-800' : 'border-gray-200'}`}>
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-indigo-700 active:scale-[0.98]"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {loading ? (
          <div className="space-y-2 px-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-8 rounded-lg animate-pulse ${dark ? 'bg-gray-800' : 'bg-gray-100'}`} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className={`px-3 py-8 text-center text-xs leading-relaxed ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            No conversations yet. Start a new chat above.
          </p>
        ) : (
          groups.map(([label, items]) => (
            <div key={label} className="mb-4">
              <p className={`mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                {label}
              </p>
              <div className="space-y-0.5">
                {items.map((conversation) => (
                  <ConversationRow
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === activeConversationId}
                    dark={dark}
                    onOpen={onOpen}
                    onRename={onRename}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ConfirmDialog({ dark, title, description, confirmLabel, onConfirm, onCancel }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const handleKey = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return createPortal(
    <>
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          backgroundColor: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}
      />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 90,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', pointerEvents: 'none',
      }}>
        <div
          style={{
            pointerEvents: 'auto',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.97)',
            transition: 'opacity 0.25s ease, transform 0.25s cubic-bezier(.4,0,.2,1)',
          }}
          className={`w-full max-w-sm rounded-2xl border p-5 shadow-xl ${
            dark ? 'bg-gray-900 border-gray-800 text-gray-100' : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <h3 className="text-base font-semibold">{title}</h3>
          <p className={`mt-2 text-sm leading-relaxed ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{description}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                dark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  )
}

export default function Chat() {
  const { dark } = useTheme()
  const d = dark
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

  const [input, setInput] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirmAll, setConfirmAll] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending, stillWorking, loadingMessages])

  const submit = (text) => {
    const value = (text ?? input).trim()
    if (!value || sending) return
    setInput('')
    sendMessage(value, { page: 'assistant', route: '/chat' })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const handleOpen = (id) => {
    openConversation(id)
    setDrawerOpen(false)
  }

  const handleNew = () => {
    newChat()
    setDrawerOpen(false)
    setInput('')
  }

  const activeTitle = conversations.find((c) => c.id === activeConversationId)?.title || 'New chat'
  const subtleText = d ? 'text-gray-500' : 'text-gray-400'
  const cardBorder = d ? 'border-gray-800' : 'border-gray-200'
  const iconHover = d ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'

  const sidebar = (
    <ConversationSidebar
      dark={d}
      conversations={conversations}
      activeConversationId={activeConversationId}
      loading={loadingConversations}
      onNewChat={handleNew}
      onOpen={handleOpen}
      onRename={renameConversation}
      onDelete={deleteConversation}
    />
  )

  return (
    <PageWrapper>
      <div className={`min-h-screen transition-colors duration-300 ${d ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <AppNav />

        <div className="w-full max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-14 py-4 sm:py-6">
          <div className={`flex w-full overflow-hidden rounded-2xl border ${cardBorder} ${d ? 'bg-gray-900' : 'bg-white'}`} style={{ height: 'calc(100vh - 11rem)', minHeight: '480px' }}>
            <aside className={`hidden w-[280px] shrink-0 border-r lg:flex ${cardBorder} ${d ? 'bg-gray-950/40' : 'bg-gray-50/70'}`}>
              {sidebar}
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className={`flex items-center justify-between gap-2 border-b px-3 py-3 sm:px-5 ${cardBorder}`}>
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label="Open conversation history"
                    onClick={() => setDrawerOpen(true)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors lg:hidden ${iconHover}`}
                  >
                    <svg width="19" height="19" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <p className={`text-xs ${subtleText}`}>Chat</p>
                    <h2 className={`truncate text-base font-semibold sm:text-lg ${d ? 'text-white' : 'text-gray-900'}`}>
                      {activeTitle}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmAll(true)}
                  disabled={sending || conversations.length === 0}
                  className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-150 sm:px-3 ${
                    sending || conversations.length === 0
                      ? d ? 'border-gray-800 text-gray-600 cursor-not-allowed' : 'border-gray-200 text-gray-300 cursor-not-allowed'
                      : d ? 'border-gray-700 text-gray-400 hover:border-red-800 hover:text-red-400' : 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
                  }`}
                >
                  Delete all chats
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-5">
                {loadingMessages ? (
                  <div className="space-y-4">
                    {[85, 70, 90, 60].map((width, i) => (
                      <div key={i} className={`h-14 animate-pulse rounded-2xl ${d ? 'bg-gray-800' : 'bg-gray-100'}`} style={{ width: `${width}%`, marginLeft: i % 2 ? 'auto' : 0 }} />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center px-2 text-center">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${d ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
                      <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5m-9 6l4-4h8a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className={`mb-1 text-sm font-medium ${d ? 'text-gray-200' : 'text-gray-800'}`}>How can I help with your finances?</p>
                    <p className={`mb-5 text-xs ${subtleText}`}>Try one of these to get started.</p>
                    <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
                      {SUGGESTIONS.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => submit(prompt)}
                          disabled={sending}
                          className={`rounded-xl border px-3 py-2 text-left text-xs transition-all duration-150 ${
                            d
                              ? 'border-gray-700 text-gray-300 hover:border-indigo-700 hover:bg-indigo-950/30'
                              : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-indigo-50'
                          } ${sending ? 'cursor-not-allowed opacity-50' : ''}`}
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
                      return (
                        <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`min-w-0 max-w-[85%] sm:max-w-[75%] ${isUser ? '' : 'w-full'}`}>
                            <div
                              className={`break-words px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                                isUser
                                  ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md'
                                  : m.failed
                                    ? d
                                      ? 'bg-red-950/40 text-red-300 border border-red-900/60 rounded-2xl rounded-bl-md'
                                      : 'bg-red-50 text-red-700 border border-red-200 rounded-2xl rounded-bl-md'
                                    : d
                                      ? 'bg-gray-800 text-gray-100 border border-gray-700 rounded-2xl rounded-bl-md'
                                      : 'bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl rounded-bl-md'
                              } ${m.pending ? 'opacity-70' : ''}`}
                            >
                              {isUser || m.failed ? m.content : <Markdown>{m.content}</Markdown>}
                            </div>
                            {!isUser && intentLabel && !m.failed && (
                              <div className="mt-1.5 px-1">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${
                                  d ? 'border-gray-700 bg-gray-800/60 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                                }`}>
                                  {intentLabel}
                                </span>
                              </div>
                            )}
                            {isUser && m.failed && (
                              <div className="mt-1.5 flex items-center justify-end gap-2 px-1">
                                <span className={`text-[11px] ${d ? 'text-red-300/80' : 'text-red-500'}`}>{m.error || 'Message failed.'}</span>
                                <button
                                  type="button"
                                  onClick={() => retryMessage(m.id)}
                                  className={`rounded-md border px-2 py-0.5 text-[11px] transition-colors ${
                                    d ? 'border-gray-700 text-gray-300 hover:border-indigo-600 hover:text-indigo-400' : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                                  }`}
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
                        <div className={`rounded-2xl rounded-bl-md border px-4 py-3 ${d ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex h-5 items-center gap-1.5">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                          </div>
                          {stillWorking && <p className={`mt-2 text-xs ${subtleText}`}>Still working...</p>}
                        </div>
                      </div>
                    )}
                    <div ref={endRef} />
                  </div>
                )}
              </div>

              <div className={`border-t px-3 py-3 sm:px-5 sm:py-4 ${cardBorder}`}>
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about spending or add a transaction..."
                    rows={1}
                    className={`min-w-0 flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors duration-150 ${
                      d
                        ? 'bg-gray-950 border-gray-700 text-gray-100 placeholder:text-gray-600 focus:border-indigo-600'
                        : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500'
                    }`}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                  />
                  <button
                    type="button"
                    onClick={() => submit()}
                    disabled={!input.trim() || sending}
                    className={`flex h-11 shrink-0 items-center justify-center rounded-xl px-4 text-sm font-medium transition-all duration-150 ${
                      input.trim() && !sending
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                        : d ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    aria-label="Send message"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" transform="rotate(90 12 12)" />
                    </svg>
                  </button>
                </div>
                <p className={`mt-2 text-[11px] ${subtleText}`}>Enter to send, Shift+Enter for a new line</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile conversation drawer */}
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            opacity: drawerOpen ? 1 : 0,
            pointerEvents: drawerOpen ? 'auto' : 'none',
            transition: 'opacity 0.25s ease',
          }}
        />
        <div
          style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            width: '280px', maxWidth: '85%',
            zIndex: 70,
            transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)',
            backgroundColor: d ? '#030712' : '#ffffff',
            borderRight: `1px solid ${d ? '#1f2937' : '#e5e7eb'}`,
          }}
          className="lg:hidden"
        >
          {sidebar}
        </div>

        {confirmAll && (
          <ConfirmDialog
            dark={d}
            title="Delete all chats?"
            description="This permanently removes every conversation and its messages. This cannot be undone."
            confirmLabel="Delete all"
            onCancel={() => setConfirmAll(false)}
            onConfirm={() => { setConfirmAll(false); clearAll() }}
          />
        )}
      </div>
    </PageWrapper>
  )
}
