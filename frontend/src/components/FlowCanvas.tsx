import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTheme } from '@/components/ThemeProvider'
import { applyLayout, type LayoutDirection } from '@/lib/layout'
import { AlignEndHorizontal, AlignEndVertical, Shuffle } from 'lucide-react'

const LAYOUT_OPTIONS: { dir: LayoutDirection; label: string; Icon: typeof Shuffle }[] = [
  { dir: 'TB',      label: 'Vertical',   Icon: AlignEndVertical },
  { dir: 'LR',      label: 'Horizontal', Icon: AlignEndHorizontal },
  { dir: 'zigzag',  label: 'Zigzag',     Icon: Shuffle },
]

interface FlowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onEdgesConnect?: (edges: Edge[]) => void
  onNodesUpdate?: (nodes: Node[]) => void
  layoutDirection?: LayoutDirection
  onLayoutChange?: (dir: LayoutDirection) => void
  activeNodeId?: string
  completedNodeIds?: Set<string>
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onEdgesConnect,
  onNodesUpdate,
  layoutDirection = 'TB',
  onLayoutChange,
  activeNodeId,
  completedNodeIds,
}: FlowCanvasProps) {
  const { theme } = useTheme()

  const displayNodes = useMemo(() => {
    if (!activeNodeId && !completedNodeIds?.size) return nodes
    return nodes.map(node => {
      const classes: string[] = []
      if (node.id === activeNodeId) classes.push('sim-active')
      else if (completedNodeIds?.has(node.id)) classes.push('sim-done')
      if (!classes.length) return node
      return { ...node, className: [node.className, ...classes].filter(Boolean).join(' ') }
    })
  }, [nodes, activeNodeId, completedNodeIds])

  const onConnect: OnConnect = useCallback(
    params => {
      if (onEdgesConnect) {
        onEdgesConnect(addEdge({ ...params, type: 'smoothstep' }, edges))
      }
    },
    [edges, onEdgesConnect],
  )

  function handleLayoutClick(dir: LayoutDirection) {
    if (onNodesUpdate) onNodesUpdate(applyLayout(nodes, edges, dir))
    if (onLayoutChange) onLayoutChange(dir)
  }

  return (
    <div className="relative w-full h-full">
      {/* Layout direction picker */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm">
        {LAYOUT_OPTIONS.map(({ dir, label, Icon }) => (
          <button
            key={dir}
            onClick={() => handleLayoutClick(dir)}
            title={label}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
              layoutDirection === dir
                ? 'bg-violet-600 text-white'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        colorMode={theme}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{ type: 'smoothstep', animated: false }}
        nodesDraggable
        nodesConnectable
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          nodeColor={() => (theme === 'dark' ? '#8b5cf6' : '#7c3aed')}
          maskColor={theme === 'dark' ? 'rgba(13,13,20,0.7)' : 'rgba(240,240,255,0.7)'}
        />
      </ReactFlow>
    </div>
  )
}
