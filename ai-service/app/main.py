import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import settings
from app.executor import execute_flow
from app.llm import generate_flow, refine_flow

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    log.info('AI Workflow service starting (env=%s)', settings.app_env)
    yield
    log.info('AI Workflow service shutting down')


app = FastAPI(title='AI Agent Workflow API', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=['*'],
    allow_headers=['*'],
)


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


@app.get('/health')
async def health():
    return {'status': 'ok', 'env': settings.app_env}


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
