import { useState, useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'

export type AgentEventType =
  | 'status'
  | 'tool_call'
  | 'tool_result'
  | 'token'
  | 'done'
  | 'error'

export interface StatusEvent   { type: 'status';      text: string }
export interface ToolCallEvent { type: 'tool_call';   tool: string; [k: string]: string }
export interface ToolResultEvent { type: 'tool_result'; tool: string; filename?: string; language?: string; content?: string; step?: string; action?: string; notes?: string }
export interface TokenEvent    { type: 'token';       text: string }
export interface DoneEvent     { type: 'done' }
export interface ErrorEvent    { type: 'error';       text: string }

export type AgentEvent =
  | StatusEvent
  | ToolCallEvent
  | ToolResultEvent
  | TokenEvent
  | DoneEvent
  | ErrorEvent

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8013'

export function useAgentExecutor() {
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [narrative, setNarrative] = useState('')

  const execute = useCallback(async (title: string, nodes: Node[], edges: Edge[]) => {
    setEvents([])
    setNarrative('')
    setIsRunning(true)

    try {
      const res = await fetch(`${API_BASE}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          nodes: nodes.map(n => ({ id: n.id, data: n.data })),
          edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label ?? '' })),
        }),
      })

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Server error ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          try {
            const event = JSON.parse(raw) as AgentEvent
            if (event.type === 'token') {
              setNarrative(prev => prev + event.text)
            } else {
              setEvents(prev => [...prev, event])
            }
          } catch {}
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setEvents(prev => [...prev, { type: 'error', text: msg }])
    } finally {
      setIsRunning(false)
    }
  }, [])

  const clear = useCallback(() => {
    setEvents([])
    setNarrative('')
  }, [])

  return { events, narrative, isRunning, execute, clear }
}
