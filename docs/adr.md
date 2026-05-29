# Architecture & Product Decision Records

Decision log for the AI Agent Workflow project. Records are append-only; superseded decisions reference their replacement.

---

## ADR-001 — FastAPI Proxy for Anthropic API

**Date:** 2026-05-29
**Status:** Accepted

### Context
The frontend needs to call the Anthropic API to convert natural language to flow JSON. The API key cannot be exposed in the browser bundle.

### Decision
All LLM calls go through a minimal Python FastAPI service (`ai-service/`). The frontend never holds the API key.

### Consequences
- (+) API key stays server-side; zero leak risk via browser devtools or source maps
- (+) Central place to add rate limiting (`asyncio.Semaphore`), logging, and Ollama fallback
- (+) CORS policy is enforced at the proxy, not the browser
- (−) Extra hop adds ~5–20ms latency locally
- (−) Requires Python environment alongside Node — higher onboarding friction

---

## ADR-002 — Strict JSON Schema Contract with Zod Validation

**Date:** 2026-05-29
**Status:** Accepted

### Context
Claude returns structured JSON representing nodes and edges. Raw LLM output is unreliable — it may include markdown fences, extra fields, or edges referencing non-existent node IDs.

### Decision
- System prompt establishes an exact JSON schema with a few-shot example
- `llm.py` strips markdown fences defensively before `json.loads()`
- Frontend validates with Zod (`lib/schema.ts`) including edge reference checks (every `source`/`target` must exist in `nodes`)
- Generation fails loudly (422 or Zod error) rather than passing malformed data to React Flow

### Consequences
- (+) React Flow never receives invalid data; no silent render bugs
- (+) Validation errors give actionable messages to the user
- (−) Strict schema requires careful prompt engineering; Claude occasionally misformats on complex flows
- (−) Defensive fence-stripping is a workaround for inconsistent Ollama output

---

## ADR-003 — dagre Auto-layout Replaces Claude Position Hints

**Date:** 2026-05-29
**Status:** Accepted

### Context
Claude is asked to provide `position: {x, y}` for each node, but its spatial reasoning is inconsistent — nodes overlap, spacing is uneven, and complex flows produce illegible layouts.

### Decision
After every `generate_flow()` or `refine_flow()` call, apply `applyDagreLayout()` (top-bottom, `nodesep=60`, `ranksep=60`) to all nodes. Claude's position values are used as layout hints only and are immediately overridden.

User drag positions are preserved: once dagre runs after generation, subsequent `onNodesChange` calls update positions in React state without re-running dagre.

### Consequences
- (+) Consistent, readable layouts regardless of Claude's spatial output
- (+) No visual debt from poorly positioned nodes
- (−) Claude's deliberate horizontal/branching layout hints are discarded
- (−) Complex graphs with many cross-edges may still require manual adjustment

---

## ADR-004 — localStorage for Persistence (MVP)

**Date:** 2026-05-29
**Status:** Accepted

### Context
Saved flows need persistence across sessions. A cloud database (Supabase, PostgreSQL) would require authentication, a backend schema, and deployment infrastructure — too heavy for MVP.

### Decision
Use `localStorage` for all flow persistence. Key: `ai-agent-workflow:flows`. Auto-save runs on every `nodes`/`edges` change, debounced 500ms to avoid thrashing.

### Consequences
- (+) Zero infrastructure; works offline
- (+) Instant read/write with no network latency
- (+) Storage survives page refresh but not browser data clear
- (−) Flows are device-local; no cross-device sync
- (−) ~5MB browser limit; flows with many nodes could approach it
- (−) No collaboration or versioning

**Future:** Replace with Supabase or a dedicated backend when Phase 4 (deployment) begins.

---

## ADR-005 — Multi-round Agentic Loop for Execution

**Date:** 2026-05-29
**Status:** Accepted

### Context
The initial two-round design (round 1: collect tool_use, round 2: stream narrative) failed when Claude decided to call `write_artifact` in round 2 — the streaming API's `text_stream` iterator does not expose tool_use blocks.

### Decision
Replace the two-round design with a **multi-round non-streaming loop** (up to `MAX_ROUNDS=6`):
1. `messages.create()` (non-streaming) — collect all tool_use blocks
2. Execute tools, emit SSE events, append results to message history
3. Repeat from step 1 while `stop_reason == "tool_use"`
4. Final `messages.stream()` call for the narrative summary (streaming text only)

The loop is bounded at 6 rounds to prevent infinite execution if Claude keeps requesting tools.

### Consequences
- (+) Handles any number of tool-use rounds; Claude can call tools across multiple turns
- (+) Final narrative still streams token-by-token for responsive UI
- (+) `asyncio.Semaphore(3)` prevents runaway concurrency
- (−) Non-streaming rounds block the SSE connection until the round completes (no intermediate progress within a round)
- (−) MAX_ROUNDS cap may cut off very complex flows; can be tuned

---

## ADR-006 — Server-Sent Events for Agent Streaming

**Date:** 2026-05-29
**Status:** Accepted

### Context
Agent execution is long-running (5–30s). Users need real-time feedback as Claude calls tools and generates artifacts. Options: polling, WebSockets, SSE.

### Decision
Use **Server-Sent Events** (SSE) via FastAPI `StreamingResponse` with `media_type="text/event-stream"`. Each event is a `data: <JSON>\n\n` line. The frontend uses `ReadableStream` directly via `fetch()` body reader (not `EventSource`).

`fetch()` was chosen over `EventSource` because `EventSource` does not support `POST` requests — the execution payload (nodes/edges) must be sent in the request body.

### Consequences
- (+) One-way server→client; simpler than WebSockets
- (+) Works through standard HTTP proxies (with `X-Accel-Buffering: no`)
- (+) Native browser support; no library needed
- (−) `fetch()`-based SSE requires manual stream reading (buf + split on `\n`)
- (−) No automatic reconnect (unlike `EventSource`); a network drop ends the execution
- (−) Each execution is a long-held HTTP connection; Nginx/load-balancer timeouts must be configured for production

---

## ADR-007 — URL Sharing via Base64-Encoded Query Parameter

**Date:** 2026-05-29
**Status:** Accepted

### Context
Users want to share diagrams with teammates. Options: database-backed short links, base64 in URL, export+import file.

### Decision
Encode the full `{title, nodes, edges}` payload as `btoa(encodeURIComponent(JSON.stringify(flow)))` into a `?flow=` query parameter. On app load, `getSharedFlow()` decodes it and `clearShareParam()` removes the param from the URL to keep the address bar clean.

### Consequences
- (+) Zero backend required; share works with no account or persistence
- (+) Survives without a running server (static hosting, offline)
- (−) URL length grows with diagram complexity; browsers cap URLs at ~2000–8000 chars
- (−) No link revocation or expiry
- (−) Base64 is not compressed; large flows produce unwieldy URLs

**Future:** Replace with database-backed short links in Phase 4.

---

## ADR-008 — html-to-image for PNG Export

**Date:** 2026-05-29
**Status:** Accepted

### Context
Phase 2 required PNG export of the React Flow canvas. The initial implementation used `toPng` from `@xyflow/react`, but this function does not exist in `@xyflow/react` v12 — it was removed and the package no longer bundles image export utilities.

### Decision
Use the `html-to-image` library (`toPng`) on the `.react-flow` DOM element. Dynamically imported (`await import('html-to-image')`) to keep it out of the main bundle.

### Consequences
- (+) Works with any DOM element; not coupled to React Flow internals
- (+) Dynamic import keeps the ~80KB library out of the initial JS bundle
- (−) Renders the visible DOM snapshot; MiniMap and Controls are included unless hidden
- (−) CSS custom properties may not resolve correctly in cross-origin contexts (not an issue for localhost)

---

## ADR-009 — Conversational Flow Refinement as a Separate Endpoint

**Date:** 2026-05-29
**Status:** Accepted

### Context
Phase 3 added the ability to modify an existing diagram with natural language instructions ("add a QA step before deploy"). Two design options: (a) extend `/api/generate` with an optional `current_flow` field, or (b) create a dedicated `/api/refine` endpoint.

### Decision
Create a dedicated **`POST /api/refine`** endpoint with its own Pydantic model (`RefineRequest`) and its own system prompt (`REFINE_SYSTEM_PROMPT` in `llm.py`). The refine prompt instructs Claude to preserve existing node IDs, minimise removals, and extend the flow logically.

The frontend uses a separate `useFlowRefiner` hook to keep generate and refine state isolated (separate loading/error states shown independently in `GeneratorPanel`).

### Consequences
- (+) Clear separation of concerns; generate and refine have different prompts and semantics
- (+) Independent loading/error state in the UI avoids ambiguity
- (+) Easier to tune the refine prompt without affecting generation
- (−) Two endpoints to maintain instead of one; more boilerplate
- (−) Refine does not have a streaming response — users wait for the full updated flow

---

## PDR-001 — Target User: Engineers Who Think in Processes

**Date:** 2026-05-29
**Status:** Accepted

### Context
Defining the primary user persona for MVP scope decisions.

### Decision
Target: **software engineers and technical leads** who mentally model problems as step-by-step processes (CI/CD pipelines, onboarding flows, incident response). They can describe a process in 1–3 sentences but find diagramming tools tedious.

### Consequences
- Shapes the example chips in `GeneratorPanel` (CI/CD, deployment, onboarding)
- Shapes the agent execution artifacts (GitHub Actions YAML > generic Markdown)
- Shapes the 5 built-in templates: CI/CD, onboarding, incident response, leave approval, feature development

---

## PDR-002 — No Authentication in MVP

**Date:** 2026-05-29
**Status:** Accepted

### Context
Adding authentication (NextAuth, Supabase Auth) significantly increases scope and deployment complexity.

### Decision
No authentication in Phases 1–3. All data is stored in `localStorage` and scoped to the local browser. The API service is intended for local development only.

### Consequences
- (+) Dramatically reduced scope; shipped faster
- (+) No cookie isolation issues (a common problem when running multiple Next.js apps locally)
- (−) No multi-device sync, no sharing beyond URL encoding, no server-side history
- (−) API service has no auth — must not be exposed to the public internet without rate limiting

**Gate for Phase 4:** Authentication becomes required before deployment. Candidates: NextAuth v5 + Supabase (following `communication-ai-assistant` pattern).
