# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Agent Workflow — converts natural language descriptions into interactive, editable workflow diagrams. User types a description → Claude generates structured JSON → React Flow renders the diagram → user can drag, edit, and save.

See `proposal.md` for full architecture, component plan, and phase breakdown.

## Tech Stack

- **Frontend:** React 19 + Vite 8 + TailwindCSS v4 (`@tailwindcss/vite`) + shadcn/ui + lucide-react
- **Diagram:** React Flow (`@xyflow/react`) with dagre auto-layout
- **AI:** Anthropic SDK (streaming, Ollama fallback) via minimal FastAPI proxy
- **Storage:** localStorage (MVP)
- **Package manager:** pnpm
- **Dev port:** 3013 (frontend) / 8013 (ai-service)

## Commands

```bash
# Frontend
pnpm install
pnpm dev          # port 3013
pnpm build
pnpm test         # vitest

# AI service (FastAPI proxy)
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8013

# Docker
docker-compose up -d
```

## Core JSON Schema (Claude must return this exactly)

```json
{
  "title": "Flow name",
  "nodes": [{ "id": "1", "data": { "label": "Step" }, "position": { "x": 0, "y": 0 } }],
  "edges": [{ "id": "e1-2", "source": "1", "target": "2", "label": "optional" }]
}
```

- No markdown fences — strip defensively
- Validate with Zod before passing to React Flow
- Apply dagre auto-layout after parse (Claude positions are layout hints only)

## Theme & Dark Mode

Follows ai-operations-portal pattern exactly:
- `ThemeProvider` + `useTheme()`, localStorage key: `ai-agent-workflow:theme`, defaults to `dark`
- FOUC prevention: inline `<script>` in `index.html` `<head>` applies dark class before React loads
- Semantic tokens only: `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`
- Accent color: violet (`violet-500` / `#8b5cf6`)
- React Flow: pass `colorMode` from `useTheme()` — never hardcode canvas colors

## Font Size Strategy

Follows ai-operations-portal pattern exactly:
- FOUC prevention: second inline `<script>` in `index.html` reads `ai-agent-workflow:font-size` from localStorage; auto-detects from `screen.width` if absent (14–18px range by screen size)
- `FontScaler` component (mounted once in `App`) re-applies on resize / focus / DPR change
- `FontSizeControl` in Settings page: +/− stepper, min 11px / max 22px, "Reset to auto"
- Storage key: `ai-agent-workflow:font-size`

Auto-detect breakpoints (matches ai-operations-portal):
`<768→16 | <1280→15 | <1440→14 | <1920→15 | <2560→16 | <3840→17 | ≥3840→18`

## Key Architecture Decisions

- Claude call goes through FastAPI proxy (`POST /api/generate`) to keep API key server-side
- `useFlowGenerator` hook owns streaming state, JSON parse, Zod validation, and error mapping
- Auto-layout (dagre) runs after every successful generate — user drag positions are preserved after that
- localStorage auto-save on node/edge changes (debounced 500ms); manual save creates named snapshot
- Path alias `@/` → `src/`

## Workspace Conventions

- Anthropic client: lazy singleton, `asyncio.Semaphore(5)`, timeouts `connect=30s read=600s write=30s`
- `APP_ENV` required (`local` / `ci` / `uat`); config via pydantic-settings `BaseSettings`
- `.env.local` for secrets (never committed); `.env.local.example` committed
- `requirements.txt` pinned exact versions
