import { Trash2, GitBranch } from 'lucide-react'
import type { SavedFlow } from '@/hooks/useSavedFlows'

interface HistoryProps {
  flows: SavedFlow[]
  onOpen: (flow: SavedFlow) => void
  onDelete: (id: string) => void
}

export function History({ flows, onOpen, onDelete }: HistoryProps) {
  if (flows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <GitBranch size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm text-[var(--muted-foreground)]">No saved diagrams yet</p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">Generate and save a flow to see it here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="mb-4 text-base font-semibold text-[var(--foreground)]">Saved diagrams</h2>
      <div className="flex flex-col gap-2">
        {flows.map(flow => (
          <div
            key={flow.id}
            className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 hover:border-violet-500/40 transition-colors"
          >
            <button
              onClick={() => onOpen(flow)}
              className="flex-1 text-left"
            >
              <p className="text-sm font-medium text-[var(--foreground)]">{flow.title}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {flow.nodes.length} nodes · {flow.edges.length} edges ·{' '}
                {new Date(flow.updatedAt).toLocaleDateString()}
              </p>
            </button>
            <button
              onClick={() => onDelete(flow.id)}
              className="ml-3 rounded p-1.5 text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              aria-label="Delete diagram"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
