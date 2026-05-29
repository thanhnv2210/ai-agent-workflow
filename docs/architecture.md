# Architecture — AI Agent Workflow

> See `docs/diagrams/` for PlantUML source files. Render with the PlantUML VS Code extension or `plantuml -tsvg docs/diagrams/*.puml`.

---

## 1. System Context

AI Agent Workflow converts natural language descriptions into interactive, editable workflow diagrams. It is a two-tier local application: a React/Vite frontend and a Python FastAPI backend that proxies all Anthropic API calls.

**Diagram:** `docs/diagrams/system-overview.puml`

### Actors & external systems

| Actor / System | Role |
|---|---|
| User | Describes workflows in plain English; edits, saves, shares, and executes diagrams |
| Anthropic Claude Sonnet 4.6 | Generates flow JSON from text; executes agentic tool-use rounds |
| Ollama (optional) | Local LLM fallback for `/api/generate` when Anthropic returns auth/request errors |
| Browser localStorage | Persists saved flows, theme preference, and font size — zero infrastructure |

---

## 2. Container Breakdown

### 2.1 Frontend — `frontend/` (React 19 + Vite 8)

| Layer | Files | Responsibility |
|---|---|---|
| **Pages** | `FlowGenerator`, `History`, `Settings` | Route-level views; `FlowGenerator` owns the main 3-pane layout |
| **Components** | `FlowCanvas`, `GeneratorPanel`, `ExecutionPanel`, `ThemeProvider`, `FontScaler` | UI rendering; `ExecutionPanel` streams and displays agent events in real time |
| **Hooks** | `useFlowGenerator`, `useFlowRefiner`, `useAgentExecutor`, `useSavedFlows` | All async state, API calls, and side effects live in hooks — pages are thin wrappers |
| **Lib** | `schema.ts`, `layout.ts`, `share.ts`, `templates.ts` | Pure utilities: Zod validation, dagre layout, base64 URL encoding, static template data |

**Key architectural rules:**
- `ReactFlowProvider` wraps `FlowGeneratorInner` (required for `useReactFlow()` to work inside the component)
- Auto-layout (dagre) runs after every generate/refine/template-load — user drag positions are preserved afterwards
- All API base URL references use `import.meta.env.VITE_API_URL ?? 'http://localhost:8013'`

### 2.2 AI Service — `ai-service/` (Python 3.12 + FastAPI)

| Module | Responsibility |
|---|---|
| `main.py` | FastAPI app, CORS middleware, three endpoints, request/response models |
| `llm.py` | `generate_flow()` and `refine_flow()` — non-streaming Claude calls with few-shot prompts |
| `executor.py` | `execute_flow()` — multi-round agentic tool-use loop with SSE streaming |
| `config.py` | pydantic-settings `BaseSettings`; reads `.env.local`; validates `APP_ENV` |

---

## 3. Key Data Flows

### 3.1 Flow Generation

```
User types description
  → GeneratorPanel → useFlowGenerator.generate()
  → POST /api/generate {description}
  → FastAPI → llm.py → Claude (few-shot + schema prompt)
  → raw JSON string
  → strip fences → Zod validate → dagre layout
  → setNodes() + setEdges() on FlowCanvas
  → auto-save to localStorage (debounced 500ms)
```

**Diagram:** `docs/diagrams/flow-generation.puml`

### 3.2 Flow Refinement

Same path as generation but uses `POST /api/refine` with the current `{title, nodes, edges}` + `instruction`. Claude is instructed to preserve existing node IDs where possible and extend the sequence.

### 3.3 Agent Execution

```
User clicks Execute
  → useAgentExecutor.execute(title, nodes, edges)
  → POST /api/execute (StreamingResponse, text/event-stream)
  → executor.py::execute_flow() acquires semaphore(3)

  ── Agentic loop (max 6 rounds) ──────────────────────────
  │  messages.create(tools=[write_artifact, log_step_analysis])
  │  For each tool_use block:
  │    log_step_analysis → SSE tool_result event
  │    write_artifact    → SSE tool_result event (with content)
  │  Append assistant + tool_results to message history
  │  Repeat while stop_reason == "tool_use"
  ─────────────────────────────────────────────────────────

  ── Final narrative round ────────────────────────────────
  │  messages.stream() → SSE token events (word by word)
  ─────────────────────────────────────────────────────────

  SSE done event → ExecutionPanel shows ✓ complete
```

**Diagram:** `docs/diagrams/agent-execution.puml`

### 3.4 URL Sharing

```
Share button clicked
  → encodeFlow(title, nodes, edges)
  → btoa(encodeURIComponent(JSON.stringify(flow)))
  → ?flow=<base64> appended to window.location
  → URL copied to clipboard

On app load (App.tsx Shell init):
  → getSharedFlow() reads ?flow= param
  → decodes to SavedFlow
  → clearShareParam() removes param from URL
  → passed as initialFlow to FlowGenerator
```

---

## 4. Agent Tool Definitions

The agent is given two tools in every execution round:

### `write_artifact`
Generates a runnable file (YAML, shell script, Markdown, etc.) and streams it to the UI.

```json
{
  "name": "write_artifact",
  "input_schema": {
    "filename": "string",
    "language": "string (yaml|bash|markdown|python|json…)",
    "content":  "string (full file content)"
  }
}
```

### `log_step_analysis`
Documents Claude's understanding of a workflow step — what it does, dependencies, concerns.

```json
{
  "name": "log_step_analysis",
  "input_schema": {
    "step":   "string (node label)",
    "action": "string (plain-English description)",
    "notes":  "string (optional — dependencies, concerns)"
  }
}
```

**Artifact generation heuristics (system prompt):**
- CI/CD or deployment flows → GitHub Actions YAML + shell deploy script
- Business/approval flows → process documentation Markdown + checklist
- Onboarding/setup flows → step-by-step runbook Markdown
- Any other flow → at least one practical artifact

---

## 5. SSE Event Schema

All events from `POST /api/execute` follow a typed discriminated union:

| `type` | Additional fields | Consumer |
|--------|------------------|----------|
| `status` | `text: string` | ExecutionPanel header spinner |
| `tool_result` (log_step_analysis) | `step, action, notes` | Step analysis cards |
| `tool_result` (write_artifact) | `filename, language, content` | Artifact code blocks |
| `token` | `text: string` | Accumulated into `narrative` string |
| `done` | — | Switches to ✓ complete state |
| `error` | `text: string` | Red error alert |

---

## 6. Theme & Font Size System

Follows the same pattern as `ai-operations-portal`:

- **FOUC prevention** — two inline `<script>` tags in `index.html` `<head>` apply dark class and font-size before React hydrates
- **Theme** — `ThemeProvider` context + `useTheme()` hook; localStorage key `ai-agent-workflow:theme`; defaults to `dark`
- **Font size** — `FontScaler` component auto-detects from `screen.width`; `FontSizeControl` in Settings for manual override; storage key `ai-agent-workflow:font-size`
- **Tokens** — semantic CSS variables only: `--background`, `--foreground`, `--card`, `--border`, `--muted-foreground`; accent `violet-600` (`#7c3aed`)
- **React Flow** — `colorMode` passed from `useTheme()`; never hardcode canvas colors

---

## 7. Concurrency & Rate Limiting

- `asyncio.Semaphore(3)` in `executor.py` limits concurrent agent executions
- `asyncio.Semaphore(5)` in `llm.py` limits concurrent generation/refine calls
- Anthropic client is a lazy singleton (`_client` module-level global) — one HTTP connection pool per process
- Request timeouts: `connect=30s`, `read=600s`, `write=30s`

---

## 8. Security Boundaries

| Boundary | Control |
|---|---|
| Anthropic API key | Lives only in `ai-service/.env.local`; never shipped to the browser |
| CORS | `CORSMiddleware` with explicit `allow_origins=settings.cors_origins_list`; no `allow_credentials` |
| Input validation | `GenerateRequest`, `ExecuteRequest`, `RefineRequest` Pydantic models; empty input rejected with 422 |
| Zod validation | All Claude-generated JSON validated before reaching React Flow |
