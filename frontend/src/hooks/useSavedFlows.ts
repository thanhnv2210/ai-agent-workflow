import { useState, useEffect, useCallback } from 'react'
import type { Node, Edge } from '@xyflow/react'
import type { AgentEvent } from '@/hooks/useAgentExecutor'

export interface SavedFlow {
  id: string
  title: string
  nodes: Node[]
  edges: Edge[]
  createdAt: string
  updatedAt: string
}

export interface ExecutionLog {
  id: string
  flowId: string
  version: number
  events: AgentEvent[]
  narrative: string
  createdAt: string
  updatedAt: string
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8013'

export function useSavedFlows() {
  const [flows, setFlows] = useState<SavedFlow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/flows`)
      .then(r => r.json())
      .then((data: SavedFlow[]) => setFlows(data))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const saveFlow = useCallback(async (title: string, nodes: Node[], edges: Edge[]): Promise<SavedFlow> => {
    const res = await fetch(`${API_BASE}/api/flows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, nodes, edges }),
    })
    if (!res.ok) throw new Error(`Failed to save flow: ${res.status}`)
    const flow: SavedFlow = await res.json()
    setFlows(prev => [flow, ...prev])
    return flow
  }, [])

  const updateFlow = useCallback(async (id: string, nodes: Node[], edges: Edge[], title?: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/api/flows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, nodes, edges }),
    })
    if (!res.ok) return
    const updated: SavedFlow = await res.json()
    setFlows(prev => prev.map(f => f.id === id ? updated : f))
  }, [])

  const deleteFlow = useCallback(async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/api/flows/${id}`, { method: 'DELETE' })
    setFlows(prev => prev.filter(f => f.id !== id))
  }, [])

  const saveExecution = useCallback(async (flowId: string, events: AgentEvent[], narrative: string): Promise<void> => {
    await fetch(`${API_BASE}/api/flows/${flowId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events, narrative }),
    })
  }, [])

  const deleteExecution = useCallback(async (flowId: string, executionId: string): Promise<void> => {
    await fetch(`${API_BASE}/api/flows/${flowId}/executions/${executionId}`, { method: 'DELETE' })
  }, [])

  return { flows, isLoading, saveFlow, updateFlow, deleteFlow, saveExecution, deleteExecution }
}
