import { useState } from 'react'
import { GitBranch, History as HistoryIcon, Settings as SettingsIcon, Workflow } from 'lucide-react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'
import { FontScaler } from '@/components/FontScaler'
import { FlowGenerator } from '@/pages/FlowGenerator'
import { History } from '@/pages/History'
import { Settings } from '@/pages/Settings'
import { useSavedFlows, type SavedFlow } from '@/hooks/useSavedFlows'
import { getSharedFlow, clearShareParam } from '@/lib/share'

type Tab = 'generator' | 'history' | 'settings'

const TABS: { id: Tab; label: string; Icon: typeof Workflow }[] = [
  { id: 'generator', label: 'Generator', Icon: Workflow },
  { id: 'history',   label: 'History',   Icon: HistoryIcon },
  { id: 'settings',  label: 'Settings',  Icon: SettingsIcon },
]

function Shell() {
  const [tab, setTab] = useState<Tab>('generator')
  const [openFlow, setOpenFlow] = useState<SavedFlow | undefined>(() => {
    const shared = getSharedFlow()
    if (!shared) return undefined
    clearShareParam()
    const now = new Date().toISOString()
    return { id: 'shared-' + Date.now(), createdAt: now, updatedAt: now, ...shared }
  })
  const { flows, saveFlow, deleteFlow } = useSavedFlows()

  function handleOpenFlow(flow: SavedFlow) {
    setOpenFlow(flow)
    setTab('generator')
  }

  function handleNewFlow() {
    setOpenFlow(undefined)
    setTab('generator')
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--background)] overflow-hidden">
      {/* Top nav */}
      <nav className="shrink-0 sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-5 py-0">
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewFlow}
              className="mr-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--foreground)] hover:text-violet-400 transition-colors"
            >
              <GitBranch size={16} className="text-violet-500" />
              AI Workflow
            </button>
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-3 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === id
                    ? 'border-violet-500 text-[var(--foreground)]'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'generator' && (
          <FlowGenerator
            key={openFlow?.id ?? 'new'}
            onSave={saveFlow}
            initialFlow={openFlow}
          />
        )}
        {tab === 'history' && (
          <History
            flows={flows}
            onOpen={handleOpenFlow}
            onDelete={deleteFlow}
          />
        )}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <FontScaler />
      <Shell />
    </ThemeProvider>
  )
}

export default App
