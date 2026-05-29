import { useCallback, useEffect, useState } from 'react'
import {
  FONT_SIZE_EVENT,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
  getAutoFontSize,
  getStoredFontSize,
  setStoredFontSize,
} from '@/components/FontScaler'

export function FontSizeControl() {
  const [autoSize, setAutoSize] = useState<number>(14)
  const [override, setOverride] = useState<number | null>(null)

  const refresh = useCallback(() => {
    setAutoSize(getAutoFontSize())
    setOverride(getStoredFontSize())
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener(FONT_SIZE_EVENT, refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener(FONT_SIZE_EVENT, refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  const current = override ?? autoSize
  const isManual = override !== null

  function adjust(delta: number) {
    const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, current + delta))
    setStoredFontSize(next)
    setOverride(next)
  }

  function reset() {
    setStoredFontSize(null)
    setOverride(null)
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-[var(--foreground)]">Font size</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {isManual ? (
            <>Manual override — auto would be <span className="text-[var(--foreground)]">{autoSize}px</span></>
          ) : (
            <>Auto-detected from screen resolution</>
          )}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {isManual && (
          <button
            onClick={reset}
            className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            Reset to auto
          </button>
        )}
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden">
          <button
            onClick={() => adjust(-1)}
            disabled={current <= FONT_SIZE_MIN}
            className="px-2.5 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Decrease font size"
          >
            −
          </button>
          <span className="min-w-[3.5rem] border-x border-[var(--border)] px-3 py-1.5 text-center text-sm font-medium tabular-nums text-[var(--foreground)]">
            {current}px
          </span>
          <button
            onClick={() => adjust(1)}
            disabled={current >= FONT_SIZE_MAX}
            className="px-2.5 py-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Increase font size"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
