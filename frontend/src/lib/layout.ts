import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

export type LayoutDirection = 'TB' | 'LR' | 'zigzag'

const NODE_WIDTH = 200
const NODE_HEIGHT = 48

export function applyLayout(nodes: Node[], edges: Edge[], direction: LayoutDirection): Node[] {
  if (direction === 'zigzag') return applyZigzagLayout(nodes, edges)
  return applyDagreLayout(nodes, edges, direction)
}

export function applyDagreLayout(nodes: Node[], edges: Edge[], rankdir: 'TB' | 'LR' = 'TB'): Node[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir, nodesep: 60, ranksep: 60 })

  nodes.forEach(node => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  return nodes.map(node => {
    const { x, y } = g.node(node.id)
    return {
      ...node,
      position: {
        x: x - NODE_WIDTH / 2,
        y: y - NODE_HEIGHT / 2,
      },
    }
  })
}

function applyZigzagLayout(nodes: Node[], edges: Edge[]): Node[] {
  const STEP_Y = 110
  const COL_LEFT = 0
  const COL_RIGHT = NODE_WIDTH + 160

  // Build out-edges and in-degree for topological sort
  const inDegree = new Map<string, number>(nodes.map(n => [n.id, 0]))
  const outEdges = new Map<string, string[]>(nodes.map(n => [n.id, []]))

  for (const e of edges) {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    outEdges.get(e.source)?.push(e.target)
  }

  // Kahn's algorithm — BFS topological order
  const queue = nodes.map(n => n.id).filter(id => inDegree.get(id) === 0)
  const order: string[] = []
  const visited = new Set<string>()

  while (queue.length > 0) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    order.push(id)
    for (const next of outEdges.get(id) ?? []) {
      const deg = (inDegree.get(next) ?? 1) - 1
      inDegree.set(next, deg)
      if (deg === 0) queue.push(next)
    }
  }

  // Any nodes in a cycle go at the end
  for (const n of nodes) {
    if (!visited.has(n.id)) order.push(n.id)
  }

  // Alternate: even indices → left column, odd → right column
  const positions = new Map<string, { x: number; y: number }>()
  order.forEach((id, i) => {
    positions.set(id, { x: i % 2 === 0 ? COL_LEFT : COL_RIGHT, y: i * STEP_Y })
  })

  return nodes.map(node => ({
    ...node,
    position: positions.get(node.id) ?? node.position,
  }))
}
