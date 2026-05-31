# Service layer for workflow.execution_logs table.

import asyncpg

from app.db.database import get_pool


async def save_execution(flow_id: str, events: list, narrative: str) -> dict:
    """Insert a new execution log, auto-assigning the next version number for this flow."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            '''INSERT INTO workflow.execution_logs (flow_id, events, narrative, version)
               VALUES (
                   $1::uuid, $2, $3,
                   (SELECT COALESCE(MAX(version), 0) + 1
                    FROM workflow.execution_logs
                    WHERE flow_id = $1::uuid)
               )
               RETURNING id, flow_id, version, events, narrative, created_at, updated_at''',
            flow_id, events, narrative,
        )
    return _to_dict(row)


async def list_executions(flow_id: str) -> list[dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT id, flow_id, version, events, narrative, created_at, updated_at '
            'FROM workflow.execution_logs '
            'WHERE flow_id = $1::uuid ORDER BY version DESC',
            flow_id,
        )
    return [_to_dict(r) for r in rows]


async def delete_execution(execution_id: str) -> bool:
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            'DELETE FROM workflow.execution_logs WHERE id = $1::uuid',
            execution_id,
        )
    return result == 'DELETE 1'


def _to_dict(row: asyncpg.Record) -> dict:
    d = dict(row)
    d['id'] = str(d['id'])
    d['flowId'] = str(d.pop('flow_id')) if d.get('flow_id') else None
    d['createdAt'] = d.pop('created_at').isoformat()
    d['updatedAt'] = d.pop('updated_at').isoformat()
    # version is already an int
    return d
