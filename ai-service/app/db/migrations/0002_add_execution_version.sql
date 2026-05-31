-- Migration 0002: Add version column to execution_logs
-- version auto-increments per flow_id (Run #1, #2, #3 …)
ALTER TABLE workflow.execution_logs
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
