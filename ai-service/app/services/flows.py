# Service layer for workflow.flows table.
# Mirrors the pattern in services/*.service.ts from the reference project.

import asyncpg

from app.db.database import get_pool


async def list_flows() -> list[dict]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            'SELECT id, title, nodes, edges, created_at, updated_at '
            'FROM workflow.flows ORDER BY updated_at DESC'
        )
    return [_to_dict(r) for r in rows]


async def create_flow(title: str, nodes: list, edges: list) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'INSERT INTO workflow.flows (title, nodes, edges) '
            'VALUES ($1, $2, $3) '
            'RETURNING id, title, nodes, edges, created_at, updated_at',
            title, nodes, edges,
        )
    return _to_dict(row)


async def update_flow(
    flow_id: str,
    title: str | None,
    nodes: list | None,
    edges: list | None,
) -> dict | None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            '''UPDATE workflow.flows
               SET title      = COALESCE($2, title),
                   nodes      = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE nodes END,
                   edges      = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE edges END,
                   updated_at = NOW()
               WHERE id = $1::uuid
               RETURNING id, title, nodes, edges, created_at, updated_at''',
            flow_id, title, nodes, edges,
        )
    return _to_dict(row) if row else None


async def delete_flow(flow_id: str) -> bool:
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute('DELETE FROM workflow.flows WHERE id = $1::uuid', flow_id)
    return result == 'DELETE 1'


def _to_dict(row: asyncpg.Record) -> dict:
    d = dict(row)
    d['id'] = str(d['id'])
    d['createdAt'] = d.pop('created_at').isoformat()
    d['updatedAt'] = d.pop('updated_at').isoformat()
    return d
