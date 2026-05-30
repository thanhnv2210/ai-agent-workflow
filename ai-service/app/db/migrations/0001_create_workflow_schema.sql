-- Migration 0001: Create workflow schema and base tables
-- Applied automatically on service startup via app/db/schema.py MIGRATIONS list.

CREATE SCHEMA IF NOT EXISTS workflow;

CREATE TABLE IF NOT EXISTS workflow.flows (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT        NOT NULL,
    nodes       JSONB       NOT NULL DEFAULT '[]',
    edges       JSONB       NOT NULL DEFAULT '[]',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow.execution_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id     UUID        REFERENCES workflow.flows(id) ON DELETE CASCADE,
    events      JSONB       NOT NULL DEFAULT '[]',
    narrative   TEXT        NOT NULL DEFAULT '',
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
