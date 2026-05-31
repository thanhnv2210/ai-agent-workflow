import { useState, useEffect } from 'react'
import { X, ChevronRight, FileCode2, AlertCircle, Trash2 } from 'lucide-react'
import type { ExecutionLog } from '@/hooks/useSavedFlows'
import type { ToolResultEvent } from '@/hooks/useAgentExecutor'

interface Props {
  logs: ExecutionLog[]
  isLoading: boolean
  onClose: () => void
  onDelete: (executionId: string) => void
}

export function ExecutionLogsPanel({ logs, isLoading, onClose, onDelete }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(logs[0]?.id ?? null)

  // Keep selection valid when logs list changes
  useEffect(() => {
    if (logs.length === 0) { setSelectedId(null); return }
    if (!logs.find(l => l.id === selectedId)) setSelectedId(logs[0].id)
  }, [logs]) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = logs.find(l => l.id === selectedId) ?? logs[0] ?? null

  const analyses = (selected?.events ?? []).filter(
    (e): e is ToolResultEvent => e.type === 'tool_result' && e.tool === 'log_step_analysis',
  )
  const artifacts = (selected?.events ?? []).filter(
    (e): e is ToolResultEvent => e.type === 'tool_result' && e.tool === 'write_artifact',
  )
  const hasError = selected?.events.some(e => e.type === 'error') ?? false

  function handleDelete(e: React.MouseEvent, log: ExecutionLog) {
    e.stopPropagation()
    onDelete(log.id)
  }

  return (
    <div className="flex h-full flex-col bg-[var(--card)] border-t border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2 shrink-0">
        <span className="text-sm font-medium text-[var(--foreground)]">Execution history</span>
        <button
          onClick={onClose}
          className="rounded p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Version tabs */}
      {logs.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 py-2 border-b border-[var(--border)] shrink-0">
          {logs.map(log => (
            <button
              key={log.id}
              onClick={() => setSelectedId(log.id)}
              className={`group flex items-center gap-1.5 shrink-0 rounded-md px-2.5 py-1 text-xs transition-colors ${
                selectedId === log.id
                  ? 'bg-violet-600 text-white'
                  : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-violet-500/40'
              }`}
            >
              <span className="font-medium">Run #{log.version}</span>
              <span className={selectedId === log.id ? 'opacity-70' : 'opacity-50'}>
                {new Date(log.createdAt).toLocaleDateString()}
              </span>
              <span
                role="button"
                onClick={e => handleDelete(e, log)}
                className={`ml-0.5 rounded p-0.5 transition-colors ${
                  selectedId === log.id
                    ? 'hover:bg-white/20 text-white/70 hover:text-white'
                    : 'text-transparent group-hover:text-[var(--muted-foreground)] hover:!text-red-400'
                }`}
                title={`Delete Run #${log.version}`}
              >
                <Trash2 size={10} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {isLoading ? (
          <p className="text-xs text-[var(--muted-foreground)]">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">
            No execution logs yet. Save the flow then click Execute to generate logs.
          </p>
        ) : selected ? (
          <>
            {/* Step analyses */}
            {analyses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                  Step analysis
                </p>
                {analyses.map((e, i) => (
                  <div
                    key={i}
                    className="flex gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  >
                    <ChevronRight size={14} className="mt-0.5 shrink-0 text-violet-400" />
                    <div>
                      <span className="font-medium text-[var(--foreground)]">{e.step}</span>
                      <span className="text-[var(--muted-foreground)]"> — {e.action}</span>
                      {e.notes && (
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{e.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Artifacts */}
            {artifacts.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                  Generated artifacts
                </p>
                {artifacts.map((e, i) => (
                  <div key={i} className="rounded-lg border border-[var(--border)] overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--muted)] px-3 py-1.5">
                      <FileCode2 size={13} className="text-violet-400" />
                      <span className="text-xs font-mono font-medium text-[var(--foreground)]">
                        {e.filename}
                      </span>
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
                    <pre className="overflow-x-auto p-3 text-xs text-[var(--foreground)] leading-relaxed bg-[var(--background)] max-h-48">
                      <code>{e.content}</code>
                    </pre>
                  </div>
                ))}
              </div>
            )}

            {/* Narrative */}
            {selected.narrative && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                  Summary
                </p>
                <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">
                  {selected.narrative}
                </p>
              </div>
            )}

            {hasError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                <AlertCircle size={13} />
                This execution completed with errors.
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
