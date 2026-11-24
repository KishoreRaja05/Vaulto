import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

let installPromptEvent = null
const promptListeners = new Set()

function emitPrompt(event) {
  installPromptEvent = event
  promptListeners.forEach((listener) => listener(event))
}

// Listen at module scope so a prompt fired before React mounts is not missed.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    emitPrompt(event)
  })
  window.addEventListener('appinstalled', () => emitPrompt(null))
}

function subscribePrompt(listener) {
  promptListeners.add(listener)
  return () => promptListeners.delete(listener)
}

function getPromptSnapshot() {
  return installPromptEvent
}

function getServerPromptSnapshot() {
  return null
}

function waitForPrompt(timeoutMs = 8000) {
  if (installPromptEvent) return Promise.resolve(installPromptEvent)

  return new Promise((resolve) => {
    let settled = false
    let timer

    const finish = (event) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      unsubscribe()
      resolve(event)
    }

    const unsubscribe = subscribePrompt((event) => {
      if (event) finish(event)
    })
    timer = setTimeout(() => finish(null), timeoutMs)
  })
}

function detectStandalone() {
  if (typeof window === 'undefined') return false
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true)
}

function detectIOS() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function detectPromptCapable() {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  return 'BeforeInstallPromptEvent' in window || /Edg\/|Chrome\/|Android/.test(ua)
}

export default function usePWAInstall() {
  const deferredPrompt = useSyncExternalStore(subscribePrompt, getPromptSnapshot, getServerPromptSnapshot)
  const [installed, setInstalled] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [standalone, setStandalone] = useState(detectStandalone)
  const [ios] = useState(detectIOS)
  const [promptCapable] = useState(detectPromptCapable)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const query = window.matchMedia?.('(display-mode: standalone)')
    const onModeChange = () => setStandalone(detectStandalone())
    if (query) {
      if (query.addEventListener) query.addEventListener('change', onModeChange)
      else query.addListener(onModeChange)
    }

    const unsubscribePrompt = subscribePrompt((event) => setInstalled(event === null))

    let active = true
    if (navigator.getInstalledRelatedApps) {
      navigator.getInstalledRelatedApps()
        .then((apps) => { if (active && apps.length > 0) setInstalled(true) })
        .catch(() => {})
    }

    return () => {
      active = false
      unsubscribePrompt()
      if (query) {
        if (query.removeEventListener) query.removeEventListener('change', onModeChange)
        else query.removeListener(onModeChange)
      }
    }
  }, [])

  const install = useCallback(async () => {
    let event = deferredPrompt

    if (!event && !ios) {
      setWaiting(true)
      try {
        event = await waitForPrompt()
      } finally {
        setWaiting(false)
      }
    }

    if (!event) return false

    try {
      event.prompt()
      const choice = await event.userChoice
      const accepted = choice?.outcome === 'accepted'
      if (accepted) emitPrompt(null)
      return accepted
    } catch {
      return false
    }
  }, [deferredPrompt, ios])

  const isInstalled = standalone || installed

  return {
    canInstall: Boolean(deferredPrompt) && !isInstalled,
    showIOSHint: ios && !isInstalled,
    supportsPrompt: promptCapable && !isInstalled,
    installing: waiting,
    install,
  }
}
