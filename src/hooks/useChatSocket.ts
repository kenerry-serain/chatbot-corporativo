import { useCallback, useEffect, useRef, useState } from 'react'
import { appConfig } from '../config'
import { getIdToken } from '../services/auth'

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'demo'

interface UseChatSocketOptions {
  conversationId: string
  enabled: boolean
  onMessage: (content: string) => void
}

function extractMessage(data: unknown): string | null {
  if (typeof data === 'string') return data
  if (!data || typeof data !== 'object') return null
  const record = data as Record<string, unknown>
  const direct = record.content ?? record.message ?? record.text
  if (typeof direct === 'string') return direct
  if (record.body && typeof record.body === 'object') {
    const body = record.body as Record<string, unknown>
    const nested = body.content ?? body.message ?? body.text
    if (typeof nested === 'string') return nested
  }
  return null
}

export function useChatSocket({ conversationId, enabled, onMessage }: UseChatSocketOptions) {
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | null>(null)
  const reconnectAttemptRef = useRef(0)
  const manuallyClosedRef = useRef(false)
  const onMessageRef = useRef(onMessage)
  const [reconnectKey, setReconnectKey] = useState(0)
  const [state, setState] = useState<ConnectionState>('demo')

  useEffect(() => { onMessageRef.current = onMessage }, [onMessage])

  useEffect(() => {
    const shouldConnect = enabled && appConfig.websocket.isConfigured
    if (!shouldConnect) {
      setState('demo')
      return
    }
    manuallyClosedRef.current = false

    async function connect() {
      setState('connecting')
      try {
        const token = await getIdToken()
        const url = new URL(appConfig.websocket.url)
        if (token && appConfig.websocket.authQueryParam) url.searchParams.set(appConfig.websocket.authQueryParam, token)
        url.searchParams.set('conversationId', conversationId)
        const socket = new WebSocket(url)
        socketRef.current = socket
        socket.onopen = () => {
          reconnectAttemptRef.current = 0
          setState('connected')
        }
        socket.onmessage = (event) => {
          let payload: unknown = event.data
          try { payload = JSON.parse(event.data) } catch { /* Text frames are valid. */ }
          const content = extractMessage(payload)
          if (content) onMessageRef.current(content)
        }
        socket.onerror = () => setState('error')
        socket.onclose = () => {
          socketRef.current = null
          if (manuallyClosedRef.current) return
          setState('disconnected')
          const delay = Math.min(1_000 * 2 ** reconnectAttemptRef.current, 15_000)
          reconnectAttemptRef.current += 1
          reconnectTimerRef.current = window.setTimeout(() => setReconnectKey((key) => key + 1), delay)
        }
      } catch {
        setState('error')
        reconnectTimerRef.current = window.setTimeout(() => setReconnectKey((key) => key + 1), 5_000)
      }
    }
    void connect()
    return () => {
      manuallyClosedRef.current = true
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [conversationId, enabled, reconnectKey])

  const send = useCallback((message: string) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false
    socketRef.current.send(JSON.stringify({ action: appConfig.websocket.action, conversationId, message }))
    return true
  }, [conversationId])

  const reconnect = useCallback(() => {
    reconnectAttemptRef.current = 0
    socketRef.current?.close()
    setReconnectKey((key) => key + 1)
  }, [])

  return { state, send, reconnect }
}
