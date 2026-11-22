import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/* eslint-disable react-refresh/only-export-components */

// Pages register a compact description of what the user is looking at (page
// name, active filters, counts). The floating assistant sends it with each
// message so answers stay relevant to the current screen.

const PageContext = createContext({ pageContext: null, register: () => {} })

export function PageContextProvider({ children }) {
  const [pageContext, setPageContext] = useState(null)
  const register = useCallback((value) => setPageContext(value), [])
  const value = useMemo(() => ({ pageContext, register }), [pageContext, register])
  return <PageContext.Provider value={value}>{children}</PageContext.Provider>
}

export const usePageContext = () => useContext(PageContext).pageContext

// Call from a page with a small plain object. Re-registers only when content changes.
export function useRegisterPageContext(context) {
  const { register } = useContext(PageContext)
  const serialized = JSON.stringify(context)
  useEffect(() => {
    register(JSON.parse(serialized))
    return () => register(null)
  }, [serialized, register])
}
