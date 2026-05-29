# AI Agent Workflow

Convert natural language descriptions into interactive, editable workflow diagrams powered by Claude AI.

Type a description → Claude generates a structured flow → React Flow renders an interactive diagram → drag, edit, and save.

**Live demo:** (Phase 4 — deployment pending)

**Docs:** [`docs/architecture.md`](docs/architecture.md) · [`docs/adr.md`](docs/adr.md) · [`docs/diagrams/`](docs/diagrams/)

---

## Features

- **Natural language → diagram** — describe any process in plain English; Claude parses it into nodes and edges
- **Interactive canvas** — drag nodes, connect edges, zoom and pan via React Flow
- **Auto-layout** — dagre algorithm arranges nodes cleanly after every generation
- **Edit in place** — rename node labels directly on the canvas
- **Save & history** — save named diagrams to localStorage; reopen and continue editing from the history tab
- **Dark mode** — dark by default, FOUC-free, toggleable per-session
- **Font size control** — auto-detected from screen resolution; manual +/− override with "Reset to auto"

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + TailwindCSS v4 |
| Components | shadcn/ui + lucide-react |
| Diagram | React Flow (`@xyflow/react`) + dagre auto-layout |
| AI | Claude Sonnet 4.6 via Anthropic SDK |
| Backend | Python 3.12 + FastAPI (AI proxy) |
| Validation | Zod (JSON schema) |
| Storage | localStorage |
| Testing | Vitest + @testing-library/react |

---

## Local Development

### Prerequisites

- Node.js 20+ and pnpm
- Python 3.12
- Anthropic API key

### Setup

```bash
# Frontend
cd frontend
pnpm install

# AI service
cd ai-service
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.local.example .env.local   # add ANTHROPIC_API_KEY
```

### Run

**Option 1 — shell aliases (recommended)**

```bash
source ~/.zshrc   # if not already loaded
aiflow-start      # starts both frontend + ai-service
aiflow-stop
aiflow-restart
aiflow-status
aiflow-logs-fe    # tail frontend logs
aiflow-logs-be    # tail api logs
```

**Option 2 — manual**

```bash
# Terminal 1 — AI service
cd ai-service
source .venv/bin/activate
uvicorn app.main:app --reload --port 8013

# Terminal 2 — Frontend
cd frontend
pnpm dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3013 |
| AI service | http://localhost:8013 |
| Health check | http://localhost:8013/health |

### Test

```bash
# Frontend unit tests
cd frontend && pnpm test

# API smoke test
curl -s http://localhost:8013/health

curl -s -X POST http://localhost:8013/api/generate \
  -H "Content-Type: application/json" \
  -d '{"description": "User logs in, views dashboard, exports report"}' | jq .
```

---

## Architecture

```
ai-agent-workflow/
├── frontend/               # React 19 + Vite 8
│   └── src/
│       ├── components/
│       │   ├── FlowCanvas.tsx       # ReactFlow wrapper + MiniMap + Controls
│       │   ├── GeneratorPanel.tsx   # Text input + example chips + generate button
│       │   ├── ThemeProvider.tsx    # Dark/light context + localStorage
│       │   ├── ThemeToggle.tsx      # Sun/Moon button
│       │   ├── FontScaler.tsx       # Auto font-size from screen.width
│       │   └── FontSizeControl.tsx  # Manual +/− override
│       ├── pages/
│       │   ├── FlowGenerator.tsx    # Main page: 35/65 split panel
│       │   ├── History.tsx          # Saved diagrams list
│       │   └── Settings.tsx         # Theme + font size
│       ├── hooks/
│       │   ├── useFlowGenerator.ts  # Claude API call → validate → layout
│       │   └── useSavedFlows.ts     # localStorage CRUD + auto-save
│       └── lib/
│           ├── schema.ts            # Zod validation for Claude JSON
│           ├── layout.ts            # dagre auto-layout
│           └── font-size-config.ts  # Shared font constants
└── ai-service/             # Python FastAPI proxy
    └── app/
        ├── main.py          # FastAPI app, CORS, /api/generate, /health
        ├── config.py        # pydantic-settings, multi-env
        └── llm.py           # Anthropic SDK + few-shot prompts + Ollama fallback
```

### Data flow

```
User types description
       ↓
GeneratorPanel → POST /api/generate
       ↓
FastAPI → Claude Sonnet 4.6 (with few-shot examples)
       ↓
JSON response → Zod validation → dagre auto-layout
       ↓
React Flow renders interactive diagram
       ↓
User drags/edits → auto-saved to localStorage (debounced 500ms)
```

### Claude JSON schema

```json
{
  "title": "Flow name",
  "nodes": [{ "id": "1", "data": { "label": "Step name" }, "position": { "x": 0, "y": 0 } }],
  "edges": [{ "id": "e1-2", "source": "1", "target": "2", "label": "transition" }]
}
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | Environment (`local` / `ci` / `uat`) | `local` |
| `ANTHROPIC_API_KEY` | Anthropic API key | required |
| `OLLAMA_BASE_URL` | Ollama fallback endpoint | `http://localhost:11434` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3013` |

Config is loaded from `.env.local` locally. CI/UAT inject env vars directly.

---

## Roadmap

### Phase 1 — MVP (complete)
- [x] Text → diagram via Claude API
- [x] React Flow canvas (drag, zoom, connect)
- [x] Dagre auto-layout
- [x] Save/history (localStorage)
- [x] Dark mode + font size system

### Phase 2 — Agentic Extension (complete)
- [x] Claude tool use — multi-round agentic loop with `write_artifact` + `log_step_analysis` tools
- [x] Execution log panel — streaming step analyses, artifact code blocks, narrative summary
- [x] Export diagram as PNG (`html-to-image`)

### Phase 3 — Polish (complete)
- [x] Conversational flow refinement — `POST /api/refine` + "Refine diagram" input
- [x] Share via URL — base64 JSON in `?flow=` param, copy-to-clipboard button
- [x] Diagram templates — 5 built-in flows (CI/CD, onboarding, incident response, approval, feature dev)

### Phase 4 — Deployment
- [ ] Authentication (NextAuth v5 + Supabase)
- [ ] Deploy frontend to Vercel, ai-service to Render
- [ ] Database-backed flow persistence and sharing short-links
