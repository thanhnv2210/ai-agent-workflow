# Service layer for workflow.execution_logs table.

import asyncpg

from app.db.database import get_pool


async def save_execution(flow_id: str, events: list, narrative: str) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'INSERT INTO workflow.execution_logs (flow_id, events, narrative) '
            'VALUES ($1::uuid, $2, $3) '
            'RETURNING id, flow_id, events, narrative, executed_at',
            flow_id, events, narrative,
        )
    return _to_dict(row)


async def list_executions(flow_id: str) -> list[dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT id, flow_id, events, narrative, executed_at '
            'FROM workflow.execution_logs '
            'WHERE flow_id = $1::uuid ORDER BY executed_at DESC',
            flow_id,
        )
    return [_to_dict(r) for r in rows]


def _to_dict(row: asyncpg.Record) -> dict:
    d = dict(row)
    d['id'] = str(d['id'])
    d['flowId'] = str(d.pop('flow_id')) if d.get('flow_id') else None
    d['executedAt'] = d.pop('executed_at').isoformat()
    return d
