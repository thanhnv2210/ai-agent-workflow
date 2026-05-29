import asyncio
import json
import logging
import re

import anthropic
import httpx

from app.config import settings

log = logging.getLogger(__name__)

_client: anthropic.AsyncAnthropic | None = None
_semaphore = asyncio.Semaphore(5)

SYSTEM_PROMPT = """\
You are a workflow diagram generator. Convert user descriptions into structured JSON.

Return ONLY valid JSON — no markdown fences, no explanations, just the JSON object.

Schema:
{
  "title": "short descriptive title",
  "nodes": [
    { "id": "1", "data": { "label": "Step name" }, "position": { "x": 0, "y": 0 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "optional transition label" }
  ]
}

Rules:
- Node ids must be unique strings ("1", "2", "3", ...)
- Every edge source and target must reference an existing node id
- Position x/y are layout hints — space nodes ~120px apart vertically
- Keep labels concise (2-6 words)
- Include edge labels only when the transition has meaningful context
- Return 3-10 nodes for typical flows

Examples of good node labels: "Customer places order", "Kitchen prepares meal", "Driver picks up", "Order delivered"
"""

FEW_SHOT: list[dict] = [
    {
        'role': 'user',
        'content': 'A customer orders pizza, the kitchen prepares it, and a driver delivers it.',
    },
    {
        'role': 'assistant',
        'content': json.dumps({
            'title': 'Pizza Delivery Flow',
            'nodes': [
                {'id': '1', 'data': {'label': 'Customer places order'}, 'position': {'x': 250, 'y': 0}},
                {'id': '2', 'data': {'label': 'Kitchen prepares pizza'}, 'position': {'x': 250, 'y': 120}},
                {'id': '3', 'data': {'label': 'Driver picks up order'}, 'position': {'x': 250, 'y': 240}},
                {'id': '4', 'data': {'label': 'Order delivered'}, 'position': {'x': 250, 'y': 360}},
            ],
            'edges': [
                {'id': 'e1-2', 'source': '1', 'target': '2', 'label': 'order placed'},
                {'id': 'e2-3', 'source': '2', 'target': '3', 'label': 'ready for pickup'},
                {'id': 'e3-4', 'source': '3', 'target': '4', 'label': 'delivered'},
            ],
        }),
    },
]


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(
            api_key=settings.anthropic_api_key,
            timeout=httpx.Timeout(connect=30, read=600, write=30, pool=30),
        )
    return _client


def _strip_fences(text: str) -> str:
    text = text.strip()
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()


async def generate_flow(description: str) -> dict:
    async with _semaphore:
        messages = FEW_SHOT + [{'role': 'user', 'content': description}]

        try:
            client = _get_client()
            response = await client.messages.create(
                model='claude-sonnet-4-6',
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=messages,
            )
            raw = response.content[0].text
        except (anthropic.BadRequestError, anthropic.AuthenticationError) as e:
            log.warning('Anthropic error (%s), falling back to Ollama', e)
            raw = await _ollama_generate(description)

        raw = _strip_fences(raw)
        return json.loads(raw)


async def _ollama_generate(description: str) -> str:
    prompt = f'{SYSTEM_PROMPT}\n\nUser: {description}\nAssistant:'
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f'{settings.ollama_base_url}/api/generate',
            json={'model': 'mistral', 'prompt': prompt, 'stream': False},
        )
        response.raise_for_status()
        return response.json()['response']
