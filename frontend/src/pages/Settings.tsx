import { useTheme } from '@/components/ThemeProvider'
import { FontSizeControl } from '@/components/FontSizeControl'
import { Moon, Sun } from 'lucide-react'

export function Settings() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="mx-auto max-w-xl p-6">
      <h2 className="mb-5 text-base font-semibold text-[var(--foreground)]">Settings</h2>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
        {/* Theme */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Theme</p>
            <p className="text-xs text-[var(--muted-foreground)]">Choose light or dark mode</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] overflow-hidden">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                theme === 'light'
                  ? 'bg-violet-600 text-white'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Sun size={13} /> Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                theme === 'dark'
                  ? 'bg-violet-600 text-white'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              <Moon size={13} /> Dark
            </button>
          </div>
        </div>

        {/* Font size */}
        <div className="px-4 py-3.5">
          <FontSizeControl />
        </div>
      </div>
    </div>
  )
}
