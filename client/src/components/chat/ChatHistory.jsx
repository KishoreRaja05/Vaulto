import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '../ui/Icon'
import { usePresence, useScrollLock } from '../ui/usePopover'

function relativeTime(value) {
  const time = new Date(value || 0).getTime()
  if (!Number.isFinite(time) || time <= 0) return 'Recently'
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
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
      className={`vl-focus flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors ${className}`}
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
            className={`min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs outline-none focus:border-indigo-500 ${
              dark ? 'bg-gray-950 border-gray-700 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          <IconButton
            label="Save name"
            onClick={save}
            className={dark ? 'text-gray-400 hover:text-indigo-300 hover:bg-gray-800' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-100'}
          >
            <Icon name="check" size={14} />
          </IconButton>
          <IconButton
            label="Cancel rename"
            onClick={cancel}
            className={dark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
          >
            <Icon name="x" size={14} />
          </IconButton>
        </div>
      ) : (
        <div className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors ${
          active
            ? dark ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-700'
            : dark ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}>
          <button
            type="button"
            onClick={() => onOpen(conversation.id)}
            className="min-w-0 flex-1 text-left"
            title={conversation.title}
          >
            <span className="block truncate font-medium">{conversation.title}</span>
            <span className={`mt-0.5 block text-[11px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
              {relativeTime(conversation.updatedAt || conversation.createdAt)}
            </span>
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              label="Rename conversation"
              onClick={() => { setDraft(conversation.title); setEditing(true); setConfirmDelete(false) }}
              className={dark ? 'text-gray-500 hover:text-indigo-300 hover:bg-gray-700/60' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-200/60'}
            >
              <Icon name="edit" size={14} />
            </IconButton>
            <IconButton
              label="Delete conversation"
              onClick={() => { setConfirmDelete((v) => !v); setEditing(false) }}
              className={dark ? 'text-gray-500 hover:text-red-400 hover:bg-gray-700/60' : 'text-gray-400 hover:text-red-600 hover:bg-gray-200/60'}
            >
              <Icon name="trash" size={14} />
            </IconButton>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className={`absolute right-2 top-full z-30 mt-1 w-48 rounded-lg border p-2.5 shadow-lg ${
          dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <p className={`mb-2 text-xs ${dark ? 'text-gray-300' : 'text-gray-700'}`}>Delete this chat?</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className={`rounded-md border px-2 py-1 text-[11px] ${dark ? 'border-gray-700 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { setConfirmDelete(false); onDelete(conversation.id) }}
              className="rounded-md bg-red-600 px-2 py-1 text-[11px] text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ConversationSidebar({ dark, conversations, activeConversationId, loading, onNewChat, onOpen, onRename, onDelete, onClearAll }) {
  const visible = conversations.filter((conversation) => conversation.hasMessages === true)
  const groups = groupConversations(visible)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [clearError, setClearError] = useState('')

  const handleClearAll = async () => {
    if (!confirmClear) {
      setClearError('')
      setConfirmClear(true)
      return
    }
    setClearing(true)
    setClearError('')
    try {
      await onClearAll()
      setConfirmClear(false)
    } catch {
      setClearError('Could not delete chats. Try again.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`shrink-0 border-b p-3 ${dark ? 'border-gray-800' : 'border-gray-200'}`}>
        <button
          type="button"
          onClick={onNewChat}
          className="vl-focus flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Icon name="plus" size={16} />
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {loading ? (
          <div className="space-y-2 px-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-10 rounded-lg animate-pulse ${dark ? 'bg-gray-800' : 'bg-gray-100'}`} />
            ))}
          </div>
        ) : visible.length === 0 ? (
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

      <div className={`shrink-0 border-t p-3 ${dark ? 'border-gray-800' : 'border-gray-200'}`}>
        {confirmClear ? (
          <div>
            <p className={`mb-2 text-[11px] leading-snug ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
              Delete all chats? This cannot be undone.
            </p>
            {clearError && (
              <p className={`mb-2 text-[11px] ${dark ? 'text-red-400' : 'text-red-600'}`}>{clearError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setConfirmClear(false); setClearError('') }}
                disabled={clearing}
                className={`vl-focus rounded-md border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  dark ? 'border-gray-700 text-gray-400 hover:bg-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing}
                className="vl-focus rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {clearing ? 'Deleting...' : 'Delete all'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleClearAll}
            disabled={visible.length === 0 || clearing}
            aria-label="Delete all chats"
            className={`vl-focus flex h-10 w-full items-center justify-center gap-2 rounded-lg border text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              dark
                ? 'border-red-900/60 text-red-400 hover:bg-red-950/30'
                : 'border-red-200 text-red-600 hover:bg-red-50'
            }`}
          >
            <Icon name="trash" size={15} />
            Delete all chats
          </button>
        )}
      </div>
    </div>
  )
}

export default function ChatHistoryOverlay({ open, onClose, dark, title = 'Chat history', ...sidebarProps }) {
  const { mounted, state } = usePresence(open, 150)
  useScrollLock(open)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  return createPortal(
    <>
      <div
        onClick={onClose}
        data-state={state}
        className={`fixed inset-0 z-[95] bg-black/45 backdrop-blur-sm vl-fade ${state === 'closed' ? 'pointer-events-none' : ''}`}
        aria-hidden="true"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-state={state}
        className={`fixed inset-0 z-[100] flex flex-col border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 md:inset-y-0 md:left-auto md:right-0 md:w-80 md:border-l md:shadow-2xl ${
          state === 'closed' ? 'pointer-events-none' : ''
        }`}
      >
        <header className={`flex h-14 shrink-0 items-center justify-between border-b px-4 ${dark ? 'border-gray-800' : 'border-gray-200'}`}>
          <h2 className={`text-sm font-semibold ${dark ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat history"
            className={`vl-focus flex h-10 w-10 items-center justify-center rounded-lg ${dark ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1">
          <ConversationSidebar dark={dark} {...sidebarProps} />
        </div>
      </section>
    </>,
    document.body
  )
}
