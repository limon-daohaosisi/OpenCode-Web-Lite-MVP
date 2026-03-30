# AGENT.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (run from root)
pnpm install

# Development
pnpm dev:web        # Start frontend at http://localhost:5173
pnpm dev:server     # Start backend at http://localhost:3001 (watch mode)

# Quality checks (run from root across all packages)
pnpm typecheck      # TypeScript check
pnpm lint           # ESLint
pnpm format         # Prettier format
pnpm format:check   # Check formatting (used in CI)
pnpm build          # Build all packages

# Per-package (cd into apps/web, apps/server, packages/shared, etc.)
pnpm typecheck
pnpm lint
pnpm build
```

There are no test scripts yet.

## Architecture

This is a **pnpm monorepo** for an AI agent execution console — a frontend/backend that orchestrates an LLM agent through a plan-and-execute workflow, with task tracking, approval gates, and session resume.

```
apps/web/         React 19 + Vite + TanStack Router + TailwindCSS
apps/server/      Hono (Node.js) REST + SSE backend
packages/shared/  DTOs, event types, tool type definitions (used by both)
packages/agent-core/  Tool registry (JSON schemas), system prompt, loop types
```

### Data flow

1. User submits a goal in the frontend `Composer`
2. Frontend POSTs to `POST /api/sessions/:sessionId/messages`
3. Backend runs `AgentLoop` → emits `SessionEvent` objects over SSE at `GET /api/sessions/:sessionId/stream`
4. Frontend `useSessionStream` hook (currently stub) consumes SSE and updates UI
5. Tools requiring approval (`write_file`, `run_command`) emit `approval.created` events; user acts in the Details pane
6. Approval decisions POST to `/api/approvals/:id/decision`

### Key types (packages/shared)

- `SessionDto` / `MessageDto` / `ToolCallDto` / `ApprovalDto` — the main data models
- `SessionEvent` — discriminated union of all SSE event shapes (`message.created`, `tool.pending`, `approval.created`, `session.resumable`, etc.)
- Tool names: `read_file` (no approval), `write_file`, `run_command` (both require approval)

### Frontend structure

Three-column workspace layout defined in `apps/web/src/router.tsx`:

- **Left:** `SessionList` — session switcher
- **Center:** `TaskBoard` (task execution status) + `TimelinePanel` (chronological event log) + `Composer` (input)
- **Right:** `DetailPane` — file preview, diffs, approval UI, command output

Feature modules live in `apps/web/src/features/`. UI prototype uses mock data from `apps/web/src/lib/mock-data.ts`. The `useSessionStream` hook in `apps/web/src/hooks/` is a stub returning `'disconnected'` — real SSE wiring is pending.

### Backend structure

`apps/server/src/app.ts` assembles Hono routes. Services use in-memory `Map` storage (no DB yet). `AgentLoop` in `apps/server/src/agent/loop.ts` drives the LLM turn loop — currently uses `MockModelClient`. Environment variables (`OPENAI_API_KEY`, `OPENAI_MODEL`, `DATABASE_PATH`) are in `.env.example`.

### Design system

Custom Tailwind theme in `apps/web/tailwind.config.ts`: colors `ink`, `mist`, `sand`, `ember`, `pine`. Fonts: Space Grotesk + IBM Plex Sans (loaded from Google Fonts in `styles.css`).

### Current status

Skeleton complete. Pending: real LLM model client, SQLite persistence, SSE wiring in frontend, actual tool execution, approval workflow, session recovery.
