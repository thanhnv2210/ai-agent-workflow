import { useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { validateFlow } from '@/lib/schema'
import { applyDagreLayout } from '@/lib/layout'

type Status = 'idle' | 'loading' | 'error'

interface FlowGeneratorState {
  status: Status
  error: string | null
}

interface FlowGeneratorResult extends FlowGeneratorState {
  generate: (description: string) => Promise<{ title: string; nodes: Node[]; edges: Edge[] } | null>
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8011'

export function useFlowGenerator(): FlowGeneratorResult {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function generate(description: string) {
    if (!description.trim()) return null
    setStatus('loading')
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail ?? `Server error ${res.status}`)
      }

      const raw = await res.json()
      const flow = validateFlow(raw)

      const rawNodes: Node[] = flow.nodes.map(n => ({
        id: n.id,
        type: 'default',
        data: { label: n.data.label },
        position: n.position,
      }))

      const rawEdges: Edge[] = flow.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'smoothstep',
      }))

      const laidOutNodes = applyDagreLayout(rawNodes, rawEdges)

      setStatus('idle')
      return { title: flow.title, nodes: laidOutNodes, edges: rawEdges }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      setStatus('error')
      return null
    }
  }

  return { status, error, generate }
}
