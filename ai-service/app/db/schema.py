# Schema definitions for the `workflow` PostgreSQL schema.
# Mirrors the pattern in the reference project (lib/db/schema.ts with pgSchema).

SCHEMA = 'workflow'

# ── DDL migrations (applied in order on startup) ──────────────────────────────

_CREATE_SCHEMA = 'CREATE SCHEMA IF NOT EXISTS workflow'

_CREATE_FLOWS = """
CREATE TABLE IF NOT EXISTS workflow.flows (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT        NOT NULL,
    nodes       JSONB       NOT NULL DEFAULT '[]',
    edges       JSONB       NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
"""

_CREATE_EXECUTION_LOGS = """
CREATE TABLE IF NOT EXISTS workflow.execution_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id     UUID        REFERENCES workflow.flows(id) ON DELETE CASCADE,
    events      JSONB       NOT NULL DEFAULT '[]',
    narrative   TEXT        NOT NULL DEFAULT '',
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
"""

MIGRATIONS: list[str] = [_CREATE_SCHEMA, _CREATE_FLOWS, _CREATE_EXECUTION_LOGS]
