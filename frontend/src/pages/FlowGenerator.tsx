import { useCallback, useState } from 'react'
import { useNodesState, useEdgesState, type Node, type Edge } from '@xyflow/react'
import { Save } from 'lucide-react'
import { FlowCanvas } from '@/components/FlowCanvas'
import { GeneratorPanel } from '@/components/GeneratorPanel'
import { useFlowGenerator } from '@/hooks/useFlowGenerator'
import type { SavedFlow } from '@/hooks/useSavedFlows'

interface FlowGeneratorProps {
  onSave: (title: string, nodes: Node[], edges: Edge[]) => SavedFlow
  initialFlow?: SavedFlow
}

export function FlowGenerator({ onSave, initialFlow }: FlowGeneratorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow?.nodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow?.edges ?? [])
  const [title, setTitle] = useState(initialFlow?.title ?? '')
  const [savedId, setSavedId] = useState<string | null>(initialFlow?.id ?? null)
  const { status, error, generate } = useFlowGenerator()

  const hasFlow = nodes.length > 0

  async function handleGenerate(description: string) {
    const result = await generate(description)
    if (result) {
      setNodes(result.nodes)
      setEdges(result.edges)
      setTitle(result.title)
      setSavedId(null)
    }
  }

  function handleSave() {
    if (!hasFlow) return
    const flow = onSave(title || 'Untitled flow', nodes, edges)
    setSavedId(flow.id)
  }

  const handleNodesUpdate = useCallback((updated: Node[]) => setNodes(updated), [setNodes])
  const handleEdgesConnect = useCallback((updated: Edge[]) => setEdges(updated), [setEdges])

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-[var(--border)] bg-[var(--card)] p-4 overflow-y-auto">
        <GeneratorPanel
          onGenerate={handleGenerate}
          isLoading={status === 'loading'}
          error={error}
        />
      </div>

      {/* Right canvas */}
      <div className="flex-1 relative">
        {!hasFlow ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-4xl opacity-20">⬡</div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Describe a workflow on the left to generate a diagram
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Title + Save bar */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm px-4 py-2">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-transparent text-sm font-medium text-[var(--foreground)] focus:outline-none placeholder:text-[var(--muted-foreground)] w-64"
                placeholder="Untitled flow"
              />
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <Save size={13} />
                {savedId ? 'Saved' : 'Save'}
              </button>
            </div>

            <div className="pt-10 h-full">
              <FlowCanvas
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodesUpdate={handleNodesUpdate}
                onEdgesConnect={handleEdgesConnect}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
