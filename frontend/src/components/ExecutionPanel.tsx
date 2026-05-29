import { useRef, useEffect } from 'react'
import { Loader2, X, FileCode2, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { AgentEvent } from '@/hooks/useAgentExecutor'

interface ExecutionPanelProps {
  events: AgentEvent[]
  narrative: string
  isRunning: boolean
  onClose: () => void
}

export function ExecutionPanel({ events, narrative, isRunning, onClose }: ExecutionPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events, narrative])

  const artifacts = events.filter(e => e.type === 'tool_result' && e.tool === 'write_artifact') as Extract<AgentEvent, { type: 'tool_result' }>[]
  const analyses = events.filter(e => e.type === 'tool_result' && e.tool === 'log_step_analysis') as Extract<AgentEvent, { type: 'tool_result' }>[]
  const error = events.find(e => e.type === 'error') as Extract<AgentEvent, { type: 'error' }> | undefined
  const isDone = events.some(e => e.type === 'done')

  return (
    <div className="flex h-full flex-col bg-[var(--card)] border-t border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 size={14} className="animate-spin text-violet-400" />
          ) : isDone ? (
            <CheckCircle2 size={14} className="text-green-400" />
          ) : error ? (
            <AlertCircle size={14} className="text-red-400" />
          ) : null}
          <span className="text-sm font-medium text-[var(--foreground)]">Execution log</span>
          {isRunning && (
            <span className="text-xs text-[var(--muted-foreground)]">
              {events.find(e => e.type === 'status') ? (events.filter(e => e.type === 'status').at(-1) as { text: string }).text : 'Running…'}
            </span>
          )}
        </div>
        <button onClick={onClose} className="rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {/* Step analyses */}
        {analyses.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Step analysis</p>
            {analyses.map((e, i) => (
              <div key={i} className="flex gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2">
                <ChevronRight size={14} className="mt-0.5 shrink-0 text-violet-400" />
                <div>
                  <span className="font-medium text-[var(--foreground)]">{e.step}</span>
                  <span className="text-[var(--muted-foreground)]"> — {e.action}</span>
                  {e.notes && <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{e.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Artifacts */}
        {artifacts.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Generated artifacts</p>
            {artifacts.map((e, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] overflow-hidden">
                <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--muted)] px-3 py-1.5">
                  <FileCode2 size={13} className="text-violet-400" />
                  <span className="text-xs font-mono font-medium text-[var(--foreground)]">{e.filename}</span>
                  <span className="ml-auto text-xs text-[var(--muted-foreground)]">{e.language}</span>
                  <button
                    onClick={() => {
                      if (e.content) {
                        const blob = new Blob([e.content], { type: 'text/plain' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = e.filename ?? 'output.txt'
                        a.click()
                        URL.revokeObjectURL(url)
                      }
                    }}
                    className="rounded px-1.5 py-0.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] transition-colors"
                  >
                    Download
                  </button>
                </div>
                <pre className="overflow-x-auto p-3 text-xs text-[var(--foreground)] leading-relaxed bg-[var(--background)] max-h-64">
                  <code>{e.content}</code>
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Narrative summary */}
        {narrative && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">Summary</p>
            <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{narrative}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error.text}</span>
          </div>
        )}

        {/* Running spinner */}
        {isRunning && !artifacts.length && !analyses.length && (
          <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
            <Loader2 size={13} className="animate-spin" />
            <span className="text-xs">Claude is analyzing the workflow…</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
