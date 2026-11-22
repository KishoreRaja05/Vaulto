import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'
import { emitDataChanged } from '../utils/dataEvents'

/* eslint-disable react-refresh/only-export-components */

const ChatContext = createContext(null)

const NEW_CHAT = '__new__'
const activeKey = (userId) => `vaulto_active_conversation_${userId}`

function readActiveId(userId) {
  if (!userId) return null
  try {
    return localStorage.getItem(activeKey(userId)) || null
  } catch {
    return null
  }
}

function writeActiveId(userId, id) {
  if (!userId) return
  try {
    localStorage.setItem(activeKey(userId), id || NEW_CHAT)
  } catch {
    // Non-critical: the conversation still stays open in memory.
  }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function friendlyError(status) {
  if (status === 401) return 'Your session expired. Please sign in again.'
  if (status === 403 || status === 404) return 'That conversation is no longer available.'
  if (status === 503) return 'The assistant is unavailable right now.'
  if (status === 504) return 'The assistant took too long. Try again.'
  if (status === 429) return 'Too many messages. Wait a moment.'
  return 'Could not send that message. Please retry.'
}

function normalizeConversation(row) {
  if (!row || typeof row !== 'object') return null
  return {
    id: row.id,
    title: row.title || 'New chat',
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  }
}

function normalizeMessage(row) {
  if (!row || typeof row !== 'object') return null
  return {
    id: row.id || makeId(),
    role: row.role === 'user' ? 'user' : 'assistant',
    content: typeof row.content === 'string' ? row.content : '',
    intent: row.intent || null,
    createdAt: row.createdAt || null,
  }
}

function byNewest(a, b) {
  return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
}

// A session is keyed by user id in ChatProvider below, so a logout/account
// switch remounts it with entirely fresh state. In-flight replies from the
// previous account cannot leak into the new one.
const ChatSession = ({ userId, logout, children }) => {
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(() => readActiveId(userId))
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [stillWorking, setStillWorking] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const activeIdRef = useRef(activeConversationId)
  const sendingRef = useRef(false)
  const mountedRef = useRef(true)
  const slowTimerRef = useRef(null)

  useEffect(() => { activeIdRef.current = activeConversationId }, [activeConversationId])

  useEffect(() => () => {
    mountedRef.current = false
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
  }, [])

  useEffect(() => {
    // Message history now lives in the database; drop every legacy message cache.
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('vaulto_chat_'))
        .forEach((key) => localStorage.removeItem(key))
    } catch {
      // Ignore storage failures.
    }
  }, [userId])

  const handleUnauthorized = useCallback((err) => {
    if (err?.response?.status === 401) {
      logout()
      return true
    }
    return false
  }, [logout])

  const setActive = useCallback((id) => {
    activeIdRef.current = id || null
    setActiveConversationId(id || null)
    writeActiveId(userId, id)
  }, [userId])

  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current)
      slowTimerRef.current = null
    }
    if (mountedRef.current) setStillWorking(false)
  }, [])

  const openConversation = useCallback(async (id) => {
    if (!id) return
    setActive(id)
    setLoadingMessages(true)
    try {
      const res = await api.get(`/conversations/${encodeURIComponent(id)}`)
      if (!mountedRef.current) return
      const data = res.data || {}
      const list = Array.isArray(data.messages) ? data.messages : []
      setMessages(list.map(normalizeMessage).filter(Boolean))
      const conv = normalizeConversation(data.conversation)
      if (conv) {
        setConversations((prev) => [...prev.filter((c) => c.id !== conv.id), conv].sort(byNewest))
      }
    } catch (err) {
      if (!mountedRef.current || handleUnauthorized(err)) return
      setMessages([])
    } finally {
      if (mountedRef.current) setLoadingMessages(false)
    }
  }, [handleUnauthorized, setActive])

  const loadConversations = useCallback(async () => {
    setLoadingConversations(true)
    try {
      const res = await api.get('/conversations')
      if (!mountedRef.current) return
      const raw = Array.isArray(res.data) ? res.data : (res.data?.conversations || [])
      const list = raw.map(normalizeConversation).filter(Boolean).sort(byNewest)
      setConversations(list)

      const stored = readActiveId(userId)
      const storedExists = stored && stored !== NEW_CHAT && list.some((c) => c.id === stored)
      if (storedExists) {
        await openConversation(stored)
      } else if (stored === NEW_CHAT) {
        setMessages([])
      } else if (list.length) {
        await openConversation(list[0].id)
      } else {
        setActive(null)
        setMessages([])
      }
    } catch (err) {
      if (!mountedRef.current || handleUnauthorized(err)) return
      setConversations([])
    } finally {
      if (mountedRef.current) setLoadingConversations(false)
    }
  }, [handleUnauthorized, openConversation, setActive, userId])

  useEffect(() => { loadConversations() }, [loadConversations])

  const newChat = useCallback(() => {
    setActive(null)
    setMessages([])
    setStillWorking(false)
  }, [setActive])

  const sendMessage = useCallback(async (text, pageContext) => {
    const content = typeof text === 'string' ? text.trim() : ''
    if (!content || sendingRef.current) return

    sendingRef.current = true
    setSending(true)
    setStillWorking(false)
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    slowTimerRef.current = setTimeout(() => {
      if (mountedRef.current) setStillWorking(true)
    }, 8000)

    const tempId = makeId()
    const targetId = activeIdRef.current
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content, pending: true }])

    try {
      const res = await api.post('/chat', {
        message: content,
        ...(targetId ? { conversationId: targetId } : {}),
        ...(pageContext ? { pageContext } : {}),
      })
      if (!mountedRef.current) return
      const data = res.data || {}
      const conversationId = data.conversationId || targetId

      if (conversationId && conversationId !== targetId) setActive(conversationId)
      setMessages((prev) => [
        ...prev.map((m) => (
          m.id === tempId
            ? { ...m, id: data.userMessageId || m.id, pending: false, failed: false }
            : m
        )),
        {
          id: data.messageId || makeId(),
          role: 'assistant',
          content: typeof data.reply === 'string' ? data.reply : 'I have no response to share.',
          intent: data.intent || null,
          createdAt: new Date().toISOString(),
        },
      ])

      // The assistant changed data (e.g. added a transaction): tell the visible page to re-fetch.
      if (data.intent === 'transaction') emitDataChanged({ source: 'assistant' })

      if (conversationId) {
        const summary = {
          id: conversationId,
          title: data.title || 'New chat',
          updatedAt: new Date().toISOString(),
        }
        setConversations((prev) => [...prev.filter((c) => c.id !== conversationId), summary].sort(byNewest))
      }
    } catch (err) {
      if (!mountedRef.current || handleUnauthorized(err)) return
      const payload = err?.response?.data || {}
      const savedId = payload.conversationId || targetId
      if (savedId && savedId !== activeIdRef.current) setActive(savedId)
      if (savedId && payload.title) {
        const summary = { id: savedId, title: payload.title, updatedAt: new Date().toISOString() }
        setConversations((prev) => [...prev.filter((c) => c.id !== savedId), summary].sort(byNewest))
      }
      setMessages((prev) => prev.map((m) => (
        m.id === tempId
          ? { ...m, pending: false, failed: true, error: friendlyError(err?.response?.status) }
          : m
      )))
    } finally {
      if (mountedRef.current) {
        clearSlowTimer()
        sendingRef.current = false
        setSending(false)
      }
    }
  }, [clearSlowTimer, handleUnauthorized, setActive])

  const retryMessage = useCallback((id) => {
    const failed = messages.find((m) => m.id === id && m.role === 'user' && m.failed)
    if (!failed) return
    setMessages((prev) => prev.filter((m) => m.id !== id))
    sendMessage(failed.content)
  }, [messages, sendMessage])

  const renameConversation = useCallback(async (id, title) => {
    const clean = String(title ?? '').trim().slice(0, 80)
    if (!id || !clean) return
    try {
      const res = await api.patch(`/conversations/${encodeURIComponent(id)}`, { title: clean })
      if (!mountedRef.current) return
      const conv = normalizeConversation(res.data?.conversation || res.data)
      if (conv) {
        setConversations((prev) => [...prev.filter((c) => c.id !== conv.id), conv].sort(byNewest))
      }
    } catch (err) {
      handleUnauthorized(err)
    }
  }, [handleUnauthorized])

  const deleteConversation = useCallback(async (id) => {
    if (!id) return
    try {
      await api.delete(`/conversations/${encodeURIComponent(id)}`)
      if (!mountedRef.current) return
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeIdRef.current === id) {
        setActive(null)
        setMessages([])
      }
    } catch (err) {
      handleUnauthorized(err)
    }
  }, [handleUnauthorized, setActive])

  const clearAll = useCallback(async () => {
    try {
      await api.delete('/conversations')
      if (!mountedRef.current) return
      setConversations([])
      setActive(null)
      setMessages([])
    } catch (err) {
      handleUnauthorized(err)
    }
  }, [handleUnauthorized, setActive])

  return (
    <ChatContext.Provider value={{
      conversations,
      activeConversationId,
      messages,
      sending,
      loading: sending,
      stillWorking,
      loadingConversations,
      loadingMessages,
      loadConversations,
      openConversation,
      newChat,
      sendMessage,
      retryMessage,
      renameConversation,
      deleteConversation,
      clearAll,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export const ChatProvider = ({ children }) => {
  const { user, logout } = useAuth()
  const userId = user?.id ?? null
  return (
    <ChatSession key={userId ?? '__anonymous__'} userId={userId} logout={logout}>
      {children}
    </ChatSession>
  )
}

export const useChat = () => useContext(ChatContext)
