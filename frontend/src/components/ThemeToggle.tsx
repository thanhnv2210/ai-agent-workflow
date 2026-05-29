import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
