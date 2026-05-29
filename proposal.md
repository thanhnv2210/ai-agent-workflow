# Proposal — AI Agent Workflow

Convert natural language descriptions into interactive, editable workflow diagrams. The user types a description, Claude generates a structured flow, React Flow renders it, and the user can drag, edit, and save the result.

**Portfolio positioning:** Demonstrates agentic AI + Claude tool use — the dominant hiring signal in AI Engineer job descriptions. Extension path: make Claude execute the workflow steps (e.g., generate GitHub Actions YAML from the diagram).

---

## Tech Stack

| Layer | Decision |
|---|---|
| Framework | React 19 + Vite 8, port 3013 |
| Styling | TailwindCSS v4 (`@tailwindcss/vite` plugin — not PostCSS) |
| Components | shadcn/ui + lucide-react |
| Diagram | React Flow (`@xyflow/react`) |
| AI | Anthropic SDK (`anthropic`) — streaming + Ollama fallback |
| Package manager | pnpm |
| Testing | Vitest + @testing-library/react + jsdom |
| Storage | localStorage (MVP) |

---

## Pages / Sections

```
/          → Flow Generator (main page: text input + canvas)
/history   → Saved diagrams list (localStorage)
/settings  → Theme toggle + font size control
```

Single-page shell (tab-based nav), same pattern as ai-operations-portal.

---

## Core Data Schema

Claude must return exactly this JSON — no markdown fences:

```json
{
  "title": "Pizza Delivery Flow",
  "nodes": [
    { "id": "1", "data": { "label": "Customer orders pizza" }, "position": { "x": 0,   "y": 0   } },
    { "id": "2", "data": { "label": "Kitchen prepares order" }, "position": { "x": 0,   "y": 120 } },
    { "id": "3", "data": { "label": "Driver delivers"        }, "position": { "x": 0,   "y": 240 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "order placed" },
    { "id": "e2-3", "source": "2", "target": "3", "label": "ready"        }
  ]
}
```

**Validation rules:** reject if `nodes` or `edges` is missing, empty, or contains invalid references. Strip markdown fences defensively (Ollama may add them).

**Node position strategy:** Claude assigns rough positions; the frontend applies a dagre auto-layout pass after parse to produce clean spacing. Stored positions reflect user drag state after layout.

---

## AI Pipeline

### 1. Flow Generation (`POST /api/generate` or direct SDK call from frontend)

Architecture decision: **client-side Anthropic call via a local proxy** for MVP — same as ai-operations-portal pattern where the frontend hits FastAPI. For this project, a minimal FastAPI endpoint keeps the API key server-side.

- Model: `claude-sonnet-4-6` (faster than Opus for structured output; no thinking needed)
- Prompt: system prompt establishes JSON schema contract + few-shot examples
- Fallback: catch `BadRequestError`/`AuthenticationError` → Ollama `mistral` via OpenAI-compatible endpoint
- Strip markdown fences on response before JSON.parse

### 2. Extension — Workflow Execution (Phase 2)

- Claude tool use: define tools like `create_github_action`, `send_webhook`, `call_api`
- User clicks "Execute" on a node → Claude decides which tool to call
- Demonstrates agent loop: plan → act → observe → reflect

---

## Component Plan

```
src/
  components/
    FlowCanvas.tsx          # <ReactFlow> wrapper — nodes, edges, onNodesChange, onEdgesChange
    FlowControls.tsx        # zoom, fit-view, auto-layout (dagre) buttons
    NodeEditor.tsx          # click a node → inline label editor
    GeneratorPanel.tsx      # textarea + example chips + generate button + streaming status
    DiagramHistory.tsx      # list of saved flows from localStorage
    ThemeProvider.tsx       # dark/light context + localStorage persistence
    ThemeToggle.tsx         # Sun/Moon button
    FontScaler.tsx          # auto-detect font size from screen.width + manual override
    FontSizeControl.tsx     # +/− stepper with "Reset to auto"
  pages/
    FlowGenerator.tsx       # GeneratorPanel (left) + FlowCanvas (right)
    History.tsx             # DiagramHistory list
    Settings.tsx            # ThemeToggle + FontSizeControl
  hooks/
    useFlowGenerator.ts     # Claude API call, SSE streaming state, parse + validate JSON
    useSavedFlows.ts        # localStorage CRUD for saved diagrams
  lib/
    font-size-config.ts     # FONT_STORAGE_KEY, FONT_SIZE_EVENT, MIN/MAX constants
    layout.ts               # dagre auto-layout helper
    schema.ts               # Zod schema for Claude JSON response validation
```

---

## Theme & Styling

Follows workspace convention exactly (copied from ai-operations-portal):

- **Dark mode default** — `ThemeProvider` + `useTheme()`. localStorage key: `ai-agent-workflow:theme`. Defaults to `dark` if no stored value.
- **FOUC prevention** — inline `<script>` in `index.html` `<head>` reads localStorage before first paint and sets `document.documentElement.classList.add('dark')`.
- **Semantic tokens only** — `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`. Never hardcode colors.
- **Accent color** — violet (`#8b5cf6` / Tailwind `violet-500`). Differentiates from teal (communication-ai-assistant) and indigo (career-growth-copilot).
- **Fonts** — Geist Sans + Geist Mono.
- **React Flow theming** — pass `colorMode` prop (`'dark'` | `'light'`) from `useTheme()` context; override edge/node colors via CSS variables to match `border-border` and `bg-card`.

---

## Font Size Strategy

Follows ai-operations-portal convention exactly:

### FOUC prevention (index.html `<head>`)
Two inline scripts before React loads:
1. **Theme script** — reads `ai-agent-workflow:theme` from localStorage, adds `dark` class to `<html>`.
2. **Font size script** — reads `ai-agent-workflow:font-size`; if absent, auto-detects from `screen.width`:

| screen.width | font-size |
|---|---|
| < 768px | 16px (mobile) |
| < 1280px | 15px (tablet) |
| < 1440px | 14px (small laptop) |
| < 1920px | 15px (MacBook 16") |
| < 2560px | 16px (1080p desktop) |
| < 3840px | 17px (1440p / 4K HiDPI) |
| ≥ 3840px | 18px (native 4K/5K) |

Sets `document.documentElement.style.fontSize` before first paint — zero flash.

### Runtime (`FontScaler` component, mounted once in `App`)
Re-applies font size on: `resize`, `focus`, `visibilitychange`, DPR change (external monitor plug/unplug), and manual override events.

### Manual override (`FontSizeControl` in Settings)
`+` / `−` stepper (1px steps), min 11px / max 22px. Shows "Auto-detected from screen resolution" or "Manual override — auto would be Xpx". "Reset to auto" clears localStorage key and reverts.

Storage keys:
- `ai-agent-workflow:theme`
- `ai-agent-workflow:font-size`

---

## Layout

```
┌─────────────────────────────────────────────┐
│  AI Workflow  [Generator] [History] [Settings] │  ← top nav + ThemeToggle
├──────────────────┬──────────────────────────┤
│                  │                           │
│  Generator       │   React Flow Canvas       │
│  Panel           │                           │
│  (left ~35%)     │   (right ~65%)            │
│                  │                           │
│  [textarea]      │   [nodes + edges]         │
│  [chips]         │   [zoom controls]         │
│  [Generate ▶]    │   [Auto-layout btn]       │
│                  │   [Save btn]              │
│  streaming       │                           │
│  status here     │                           │
│                  │                           │
└──────────────────┴──────────────────────────┘
```

---

## Storage (MVP)

All persistence via localStorage:
- `ai-agent-workflow:flows` — `SavedFlow[]` JSON array
- `SavedFlow` shape: `{ id, title, nodes, edges, createdAt, updatedAt }`
- Auto-save on `onNodesChange` / `onEdgesChange` (debounced 500ms)
- Manual save button creates a named snapshot in history

---

## Development Phases

### Phase 1 — MVP
- [ ] Scaffold: Vite + React 19 + TailwindCSS v4 + shadcn/ui + pnpm
- [ ] `index.html` FOUC scripts (theme + font size)
- [ ] `ThemeProvider`, `ThemeToggle`, `FontScaler`, `FontSizeControl`
- [ ] FastAPI ai-service stub (proxy Anthropic key, `POST /api/generate`)
- [ ] `useFlowGenerator` hook — Claude call, JSON parse, Zod validation
- [ ] `FlowCanvas` — React Flow with dagre auto-layout
- [ ] `GeneratorPanel` — textarea, example chips, streaming status
- [ ] localStorage save/load (`useSavedFlows`)
- [ ] Settings page (theme + font size)

### Phase 2 — Agentic Extension
- [ ] Claude tool use — define `generate_yaml`, `create_github_action`, `send_webhook` tools
- [ ] "Execute" button per node → agent loop (plan → act → observe → reflect)
- [ ] Execution log panel — stream Claude's reasoning + tool call results
- [ ] Export diagram as PNG (React Flow `getViewport` + html2canvas)

### Phase 3 — Polish
- [ ] LangGraph-style stateful agent (multi-step flow refinement)
- [ ] Share diagram via URL (base64-encoded JSON in query param)
- [ ] Diagram templates (CI/CD pipeline, onboarding flow, incident response)

---

## Workspace Conventions (carry over)

From `ai-operations-portal` / `communication-ai-assistant`:
- Path alias `@/` → `src/` in `vite.config.ts` + `tsconfig.json`
- `requirements.txt` pinned exact versions
- `.env.local` for local secrets, never committed; `.env.local.example` committed
- `APP_ENV` required at startup (local / ci / uat)
- Anthropic client: lazy singleton, `asyncio.Semaphore(5)`, `connect=30s read=600s write=30s` timeouts
- React Flow theming synced to `useTheme()` — never hardcode dark/light colors in canvas
