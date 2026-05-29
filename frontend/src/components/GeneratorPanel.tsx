import { useState } from 'react'
import { Loader2, Sparkles, AlertCircle } from 'lucide-react'

const EXAMPLE_CHIPS = [
  'Customer onboarding process',
  'Software deployment pipeline',
  'Bug report to resolution',
  'Employee leave request approval',
  'E-commerce order fulfillment',
]

interface GeneratorPanelProps {
  onGenerate: (description: string) => void
  isLoading: boolean
  error: string | null
}

export function GeneratorPanel({ onGenerate, isLoading, error }: GeneratorPanelProps) {
  const [text, setText] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (text.trim() && !isLoading) onGenerate(text.trim())
  }

  function handleChip(chip: string) {
    setText(chip)
    if (!isLoading) onGenerate(chip)
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground)]">Describe your workflow</h2>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
          Claude will convert your description into an interactive diagram.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. A customer submits an order, the warehouse picks the items, QA checks quality, then shipping delivers the package..."
          rows={6}
          disabled={isLoading}
          className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles size={15} />
              Generate diagram
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">Examples</p>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => handleChip(chip)}
              disabled={isLoading}
              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:border-violet-500/50 hover:text-[var(--foreground)] disabled:opacity-50 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
