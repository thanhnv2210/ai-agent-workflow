import { useState } from 'react'
import { Loader2, Sparkles, AlertCircle, LayoutTemplate, ChevronDown, Wand2 } from 'lucide-react'
import { TEMPLATES, type FlowTemplate } from '@/lib/templates'

const EXAMPLE_CHIPS = [
  'Customer onboarding process',
  'Software deployment pipeline',
  'Bug report to resolution',
  'Employee leave request approval',
  'E-commerce order fulfillment',
]

interface GeneratorPanelProps {
  onGenerate: (description: string) => void
  onLoadTemplate: (template: FlowTemplate) => void
  onRefine: (instruction: string) => void
  isLoading: boolean
  isRefining: boolean
  hasFlow: boolean
  refineError: string | null
  error: string | null
}

export function GeneratorPanel({ onGenerate, onLoadTemplate, onRefine, isLoading, isRefining, hasFlow, refineError, error }: GeneratorPanelProps) {
  const [text, setText] = useState('')
  const [refineText, setRefineText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

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

      {/* Refine existing flow */}
      {hasFlow && (
        <div className="border-t border-[var(--border)] pt-4">
          <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">Refine current flow</p>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (refineText.trim() && !isRefining) {
                onRefine(refineText.trim())
                setRefineText('')
              }
            }}
            className="flex flex-col gap-2"
          >
            <textarea
              value={refineText}
              onChange={e => setRefineText(e.target.value)}
              placeholder="e.g. Add a QA step before deployment, split the login node into two..."
              rows={3}
              disabled={isRefining}
              className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={!refineText.trim() || isRefining}
              className="flex items-center justify-center gap-2 rounded-lg border border-violet-500/40 bg-violet-600/10 px-4 py-2 text-sm font-medium text-violet-400 hover:bg-violet-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isRefining ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Refining…
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  Refine diagram
                </>
              )}
            </button>
          </form>
          {refineError && (
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{refineError}</span>
            </div>
          )}
        </div>
      )}

      {/* Templates */}
      <div className="border-t border-[var(--border)] pt-4">
        <button
          onClick={() => setShowTemplates(v => !v)}
          className="flex w-full items-center justify-between text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <LayoutTemplate size={13} />
            Templates
          </span>
          <ChevronDown
            size={13}
            className={`transition-transform ${showTemplates ? 'rotate-180' : ''}`}
          />
        </button>

        {showTemplates && (
          <div className="mt-2 space-y-1.5">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => onLoadTemplate(t)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-left hover:border-violet-500/40 hover:bg-[var(--card)] transition-colors"
              >
                <p className="text-xs font-medium text-[var(--foreground)]">{t.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
