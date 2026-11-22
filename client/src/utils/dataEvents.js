import { useEffect, useRef } from 'react'

// Lightweight "server data changed" signal. The assistant fires it after it
// performs an action (e.g. adds a transaction) so the page on screen re-fetches
// without a full reload.
const EVENT = 'vaulto:data-changed'

export const emitDataChanged = (detail = {}) => {
  window.dispatchEvent(new CustomEvent(EVENT, { detail }))
}

export function useDataRefresh(callback) {
  const ref = useRef(callback)
  useEffect(() => { ref.current = callback })
  useEffect(() => {
    const handler = (event) => ref.current?.(event.detail)
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])
}
