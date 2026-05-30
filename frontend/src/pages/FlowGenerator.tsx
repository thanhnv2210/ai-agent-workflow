import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNodesState, useEdgesState, useReactFlow, type Node, type Edge } from '@xyflow/react'
import { Download, Link, Play, Save } from 'lucide-react'
import { FlowCanvas } from '@/components/FlowCanvas'
import { GeneratorPanel } from '@/components/GeneratorPanel'
import { ExecutionPanel } from '@/components/ExecutionPanel'
import { useFlowGenerator } from '@/hooks/useFlowGenerator'
import { useFlowRefiner } from '@/hooks/useFlowRefiner'
import { useAgentExecutor, type AgentEvent, type ToolResultEvent } from '@/hooks/useAgentExecutor'
import { encodeFlow } from '@/lib/share'
import { applyLayout, applyDagreLayout, type LayoutDirection } from '@/lib/layout'
import type { FlowTemplate } from '@/lib/templates'
import type { SavedFlow } from '@/hooks/useSavedFlows'

interface FlowGeneratorProps {
  onSave: (title: string, nodes: Node[], edges: Edge[]) => Promise<SavedFlow>
  onSaveExecution?: (flowId: string, events: AgentEvent[], narrative: string) => Promise<void>
  initialFlow?: SavedFlow
}

function FlowGeneratorInner({ onSave, onSaveExecution, initialFlow }: FlowGeneratorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow?.nodes ?? [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow?.edges ?? [])
  const [title, setTitle] = useState(initialFlow?.title ?? '')
  const [savedId, setSavedId] = useState<string | null>(initialFlow?.id ?? null)
  const [showExecution, setShowExecution] = useState(false)
  const [copied, setCopied] = useState(false)
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('TB')
  const { status, error, generate } = useFlowGenerator()
  const { status: refineStatus, error: refineError, refine } = useFlowRefiner()
  const { events, narrative, isRunning, execute, clear } = useAgentExecutor()
  const { getNodes } = useReactFlow()
  const canvasRef = useRef<HTMLDivElement>(null)

  const hasFlow = nodes.length > 0

  async function handleRefine(instruction: string) {
    const result = await refine(title || 'Untitled flow', nodes, edges, instruction)
    if (result) {
      setNodes(result.nodes)
      setEdges(result.edges)
      setTitle(result.title)
      setSavedId(null)
    }
  }

  function handleLoadTemplate(template: FlowTemplate) {
    const rawNodes = template.nodes.map(n => ({ ...n, position: { x: 0, y: 0 } }))
    const layouted = applyLayout(rawNodes, template.edges, layoutDirection)
    setNodes(layouted)
    setEdges(template.edges)
    setTitle(template.title)
    setSavedId(null)
    setShowExecution(false)
    clear()
  }

  async function handleGenerate(description: string) {
    const result = await generate(description)
    if (result) {
      setNodes(applyLayout(result.nodes, result.edges, layoutDirection))
      setEdges(result.edges)
      setTitle(result.title)
      setSavedId(null)
      setShowExecution(false)
      clear()
    }
  }

  async function handleSave() {
    if (!hasFlow) return
    const flow = await onSave(title || 'Untitled flow', nodes, edges)
    setSavedId(flow.id)
  }

  async function handleExecute() {
    if (!hasFlow || isRunning) return
    setShowExecution(true)
    clear()
    await execute(title || 'Untitled flow', getNodes(), edges)
  }

  async function handleShare() {
    const encoded = encodeFlow(title || 'Untitled flow', nodes, edges)
    const url = `${window.location.origin}${window.location.pathname}?flow=${encoded}`
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleExportPng() {
    if (!canvasRef.current) return
    const el = canvasRef.current.querySelector('.react-flow') as HTMLElement
    if (!el) return
    const { toPng } = await import('html-to-image')
    const dataUrl = await toPng(el, { backgroundColor: 'transparent' })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${title || 'flow'}.png`
    a.click()
  }

  const handleNodesUpdate = useCallback((updated: Node[]) => setNodes(updated), [setNodes])
  const handleEdgesConnect = useCallback((updated: Edge[]) => setEdges(updated), [setEdges])

  // Save execution log to DB when execution completes and the flow has been saved
  const prevIsRunning = useRef(false)
  useEffect(() => {
    if (prevIsRunning.current && !isRunning && savedId && onSaveExecution) {
      const isDone = events.some((e: AgentEvent) => e.type === 'done')
      if (isDone) {
        onSaveExecution(savedId, events, narrative).catch(() => {})
      }
    }
    prevIsRunning.current = isRunning
  }, [isRunning]) // eslint-disable-line react-hooks/exhaustive-deps

  const { activeNodeId, completedNodeIds } = useMemo(() => {
    const analyses = events.filter(
      (e): e is ToolResultEvent => e.type === 'tool_result' && e.tool === 'log_step_analysis',
    )
    if (!analyses.length) return { activeNodeId: undefined, completedNodeIds: new Set<string>() }

    const isDone = events.some(e => e.type === 'done')
    const findId = (step?: string) => nodes.find(n => String(n.data.label) === step)?.id

    const completedNodeIds = new Set(
      (isDone ? analyses : analyses.slice(0, -1))
        .map(e => findId(e.step))
        .filter((id): id is string => !!id),
    )
    const activeNodeId = isDone ? undefined : findId(analyses.at(-1)?.step)

    return { activeNodeId, completedNodeIds }
  }, [events, nodes])

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-[var(--border)] bg-[var(--card)] p-4 overflow-y-auto">
        <GeneratorPanel
          onGenerate={handleGenerate}
          onLoadTemplate={handleLoadTemplate}
          onRefine={handleRefine}
          isLoading={status === 'loading'}
          isRefining={refineStatus === 'loading'}
          hasFlow={hasFlow}
          refineError={refineError}
          error={error}
        />
      </div>

      {/* Right canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
            {/* Toolbar */}
            <div className="shrink-0 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm px-4 py-2">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-transparent text-sm font-medium text-[var(--foreground)] focus:outline-none placeholder:text-[var(--muted-foreground)] w-56"
                placeholder="Untitled flow"
              />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleShare}
                  title="Copy share link"
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <Link size={13} />
                  {copied ? 'Copied!' : 'Share'}
                </button>
                <button
                  onClick={handleExportPng}
                  title="Export as PNG"
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <Download size={13} />
                  Export PNG
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <Save size={13} />
                  {savedId ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={handleExecute}
                  disabled={isRunning}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play size={13} />
                  {isRunning ? 'Running…' : 'Execute'}
                </button>
              </div>
            </div>

            {/* Canvas + Execution panel split */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div ref={canvasRef} className={showExecution ? 'h-[55%]' : 'flex-1'}>
                <FlowCanvas
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodesUpdate={handleNodesUpdate}
                  onEdgesConnect={handleEdgesConnect}
                  layoutDirection={layoutDirection}
                  onLayoutChange={setLayoutDirection}
                  activeNodeId={activeNodeId}
                  completedNodeIds={completedNodeIds}
                />
              </div>

              {showExecution && (
                <div className="h-[45%] overflow-hidden">
                  <ExecutionPanel
                    events={events}
                    narrative={narrative}
                    isRunning={isRunning}
                    onClose={() => setShowExecution(false)}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ReactFlowProvider is required for useReactFlow() to work
import { ReactFlowProvider } from '@xyflow/react'

export function FlowGenerator(props: FlowGeneratorProps) {
  return (
    <ReactFlowProvider>
      <FlowGeneratorInner {...props} />
    </ReactFlowProvider>
  )
}
