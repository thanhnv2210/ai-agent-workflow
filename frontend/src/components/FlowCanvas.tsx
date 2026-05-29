import { useCallback } from 'react'
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
import { applyDagreLayout } from '@/lib/layout'
import { LayoutDashboard } from 'lucide-react'

interface FlowCanvasProps {
  nodes: Node[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onEdgesConnect?: (edges: Edge[]) => void
  onNodesUpdate?: (nodes: Node[]) => void
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onEdgesConnect,
  onNodesUpdate,
}: FlowCanvasProps) {
  const { theme } = useTheme()

  const onConnect: OnConnect = useCallback(
    params => {
      if (onEdgesConnect) {
        onEdgesConnect(addEdge({ ...params, type: 'smoothstep' }, edges))
      }
    },
    [edges, onEdgesConnect],
  )

  function handleAutoLayout() {
    if (onNodesUpdate) {
      onNodesUpdate(applyDagreLayout(nodes, edges))
    }
  }

  return (
    <div className="relative w-full h-full">
      {/* Auto-layout button */}
      <button
        onClick={handleAutoLayout}
        title="Auto-layout"
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shadow-sm"
      >
        <LayoutDashboard size={13} />
        Auto layout
      </button>

      <ReactFlow
        nodes={nodes}
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
