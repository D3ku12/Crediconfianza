import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { API_URL } from '../config/api'

const listeners = new Set()
let socket = null

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function notify() {
  listeners.forEach(fn => {
    try { fn() } catch (e) { console.error(e) }
  })
}

export function RealtimeProvider({ children }) {
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    })

    socket.on('dataChange', () => { notify() })

    const interval = setInterval(notify, 30000)

    return () => {
      if (socket) { socket.disconnect(); socket = null }
      clearInterval(interval)
    }
  }, [])

  return children
}
