import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { API_URL } from '../config/api'

const RealtimeContext = createContext(null)

export function RealtimeProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0)

  const increment = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    })

    socket.on('dataChange', () => {
      increment()
    })

    return () => { socket.disconnect() }
  }, [increment])

  return (
    <RealtimeContext.Provider value={{ refreshKey }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRefresh() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRefresh must be used within RealtimeProvider')
  return ctx.refreshKey
}
