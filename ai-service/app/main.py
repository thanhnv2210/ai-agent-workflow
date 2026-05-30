import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.db.database import close_pool, get_pool
from app.db.schema import MIGRATIONS
from app.executor import execute_flow
from app.llm import generate_flow, refine_flow
from app.services import executions as execution_service
from app.services import flows as flow_service

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    log.info('AI Workflow service starting (env=%s)', settings.app_env)
    pool = await get_pool()
    async with pool.acquire() as conn:
        for sql in MIGRATIONS:
            await conn.execute(sql)
    log.info('Database migrations applied (schema: workflow)')
    yield
    await close_pool()
    log.info('AI Workflow service shutting down')


app = FastAPI(title='AI Agent Workflow API', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=['*'],
    allow_headers=['*'],
)


# ── LLM request/response models ───────────────────────────────────────────────

class GenerateRequest(BaseModel):
    description: str


class ExecuteRequest(BaseModel):
    title: str
    nodes: list[dict]
    edges: list[dict]


class RefineRequest(BaseModel):
    title: str
    nodes: list[dict]
    edges: list[dict]
    instruction: str


class GenerateResponse(BaseModel):
    title: str
    nodes: list[dict]
    edges: list[dict]


# ── Flow CRUD models ──────────────────────────────────────────────────────────

class FlowCreate(BaseModel):
    title: str
    nodes: list[dict]
    edges: list[dict]


class FlowUpdate(BaseModel):
    title: str | None = None
    nodes: list[dict] | None = None
    edges: list[dict] | None = None


# ── Execution log models ──────────────────────────────────────────────────────

class SaveExecutionRequest(BaseModel):
    events: list[dict]
    narrative: str


# ── Health ────────────────────────────────────────────────────────────────────

@app.get('/health')
async def health():
    return {'status': 'ok', 'env': settings.app_env}


# ── Flows ─────────────────────────────────────────────────────────────────────

@app.get('/api/flows')
async def get_flows():
    return await flow_service.list_flows()


@app.post('/api/flows', status_code=201)
async def create_flow(req: FlowCreate):
    return await flow_service.create_flow(req.title, req.nodes, req.edges)


@app.put('/api/flows/{flow_id}')
async def update_flow(flow_id: str, req: FlowUpdate):
    result = await flow_service.update_flow(flow_id, req.title, req.nodes, req.edges)
    if not result:
        raise HTTPException(status_code=404, detail='Flow not found')
    return result


@app.delete('/api/flows/{flow_id}', status_code=204)
async def delete_flow(flow_id: str):
    deleted = await flow_service.delete_flow(flow_id)
    if not deleted:
        raise HTTPException(status_code=404, detail='Flow not found')


# ── Execution logs ────────────────────────────────────────────────────────────

@app.post('/api/flows/{flow_id}/executions', status_code=201)
async def save_execution(flow_id: str, req: SaveExecutionRequest):
    return await execution_service.save_execution(flow_id, req.events, req.narrative)


@app.get('/api/flows/{flow_id}/executions')
async def get_executions(flow_id: str):
    return await execution_service.list_executions(flow_id)


# ── LLM endpoints ─────────────────────────────────────────────────────────────

@app.post('/api/execute')
async def execute(req: ExecuteRequest):
    if not req.nodes:
        raise HTTPException(status_code=422, detail='No nodes to execute')
    return StreamingResponse(
        execute_flow(req.title, req.nodes, req.edges),
        media_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )


@app.post('/api/refine', response_model=GenerateResponse)
async def refine(req: RefineRequest):
    if not req.instruction.strip():
        raise HTTPException(status_code=422, detail='instruction is required')
    if not req.nodes:
        raise HTTPException(status_code=422, detail='nodes are required')
    try:
        result = await refine_flow(req.title, req.nodes, req.edges, req.instruction)
        return GenerateResponse(**result)
    except (ValueError, KeyError) as e:
        log.error('Flow refinement failed: %s', e)
        raise HTTPException(status_code=422, detail=f'Failed to parse refined flow: {e}')
    except Exception as e:
        log.error('Unexpected error during refinement: %s', e)
        raise HTTPException(status_code=500, detail='Flow refinement failed')


@app.post('/api/generate', response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    if not req.description.strip():
        raise HTTPException(status_code=422, detail='description is required')
    try:
        result = await generate_flow(req.description)
        return GenerateResponse(**result)
    except (ValueError, KeyError) as e:
        log.error('Flow generation failed: %s', e)
        raise HTTPException(status_code=422, detail=f'Failed to parse flow: {e}')
    except Exception as e:
        log.error('Unexpected error: %s', e)
        raise HTTPException(status_code=500, detail='Flow generation failed')
