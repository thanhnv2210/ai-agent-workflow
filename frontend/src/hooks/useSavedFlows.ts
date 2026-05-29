import { useState, useEffect, useCallback, useRef } from 'react'
import type { Node, Edge } from '@xyflow/react'

export interface SavedFlow {
  id: string
  title: string
  nodes: Node[]
  edges: Edge[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'ai-agent-workflow:flows'

function loadFlows(): SavedFlow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedFlow[]) : []
  } catch {
    return []
  }
}

function persistFlows(flows: SavedFlow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flows))
  } catch {}
}

export function useSavedFlows() {
  const [flows, setFlows] = useState<SavedFlow[]>(loadFlows)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    persistFlows(flows)
  }, [flows])

  const saveFlow = useCallback((title: string, nodes: Node[], edges: Edge[]): SavedFlow => {
    const now = new Date().toISOString()
    const flow: SavedFlow = {
      id: crypto.randomUUID(),
      title,
      nodes,
      edges,
      createdAt: now,
      updatedAt: now,
    }
    setFlows(prev => [flow, ...prev])
    return flow
  }, [])

  const updateFlow = useCallback((id: string, nodes: Node[], edges: Edge[]) => {
    setFlows(prev =>
      prev.map(f =>
        f.id === id ? { ...f, nodes, edges, updatedAt: new Date().toISOString() } : f,
      ),
    )
  }, [])

  const autoSave = useCallback((id: string, nodes: Node[], edges: Edge[]) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => updateFlow(id, nodes, edges), 500)
  }, [updateFlow])

  const deleteFlow = useCallback((id: string) => {
    setFlows(prev => prev.filter(f => f.id !== id))
  }, [])

  return { flows, saveFlow, updateFlow, autoSave, deleteFlow }
}
