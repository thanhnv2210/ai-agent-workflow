import { useState } from 'react'
import type { Node, Edge } from '@xyflow/react'
import { validateFlow } from '@/lib/schema'
import { applyDagreLayout } from '@/lib/layout'

type Status = 'idle' | 'loading' | 'error'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8013'

export function useFlowRefiner() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  async function refine(
    title: string,
    nodes: Node[],
    edges: Edge[],
    instruction: string,
  ): Promise<{ title: string; nodes: Node[]; edges: Edge[] } | null> {
    if (!instruction.trim()) return null
    setStatus('loading')
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          nodes: nodes.map(n => ({ id: n.id, data: n.data, position: n.position })),
          edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label ?? '' })),
          instruction,
        }),
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

  return { status, error, refine }
}
