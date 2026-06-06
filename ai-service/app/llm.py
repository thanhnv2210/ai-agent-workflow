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


BPMN_SYSTEM_PROMPT = """\
You are a BPMN (Business Process Model and Notation) diagram generator.
Convert user descriptions into structured BPMN JSON using standard element types.

Return ONLY valid JSON — no markdown fences, no explanations, just the JSON object.

Node types — you MUST use exactly these strings in the "type" field:
- "bpmn-start"   → Start Event: the single entry point of the process
- "bpmn-end"     → End Event: process termination (can have multiple)
- "bpmn-task"    → Task/Activity: a unit of work (use action verbs: Review, Send, Approve)
- "bpmn-gateway" → Gateway: a decision or parallel split (label as a yes/no question)

Schema:
{
  "title": "short descriptive title",
  "nodes": [
    { "id": "1", "type": "bpmn-start",   "data": { "label": "Start" },              "position": { "x": 0, "y": 0 } },
    { "id": "2", "type": "bpmn-task",    "data": { "label": "Submit application" }, "position": { "x": 0, "y": 120 } },
    { "id": "3", "type": "bpmn-gateway", "data": { "label": "Approved?" },          "position": { "x": 0, "y": 240 } },
    { "id": "4", "type": "bpmn-end",     "data": { "label": "End" },                "position": { "x": 0, "y": 360 } }
  ],
  "edges": [
    { "id": "e1-2",  "source": "1", "target": "2", "label": "" },
    { "id": "e2-3",  "source": "2", "target": "3", "label": "submitted" },
    { "id": "e3-4",  "source": "3", "target": "4", "label": "yes" },
    { "id": "e3-5",  "source": "3", "target": "5", "label": "no" }
  ]
}

Rules:
- Always include exactly one bpmn-start node
- Always include at least one bpmn-end node
- Every decision point must be a bpmn-gateway with a yes/no question as label
- Label all edges leaving a gateway with the condition (yes/no or a short phrase)
- Node ids must be unique strings ("1", "2", "3", ...)
- Every edge source and target must reference an existing node id
- Keep labels concise (2-5 words)
- Return 4-12 nodes for typical flows
"""

BPMN_FEW_SHOT: list[dict] = [
    {
        'role': 'user',
        'content': 'An employee submits a leave request, the manager reviews it, and HR either approves or rejects it.',
    },
    {
        'role': 'assistant',
        'content': '{"title":"Leave Request Process","nodes":[{"id":"1","type":"bpmn-start","data":{"label":"Start"},"position":{"x":250,"y":0}},{"id":"2","type":"bpmn-task","data":{"label":"Submit leave request"},"position":{"x":250,"y":120}},{"id":"3","type":"bpmn-task","data":{"label":"Manager reviews request"},"position":{"x":250,"y":240}},{"id":"4","type":"bpmn-gateway","data":{"label":"Manager approved?"},"position":{"x":250,"y":360}},{"id":"5","type":"bpmn-task","data":{"label":"HR processes approval"},"position":{"x":100,"y":480}},{"id":"6","type":"bpmn-task","data":{"label":"Notify rejection"},"position":{"x":400,"y":480}},{"id":"7","type":"bpmn-end","data":{"label":"End"},"position":{"x":250,"y":600}}],"edges":[{"id":"e1-2","source":"1","target":"2","label":""},{"id":"e2-3","source":"2","target":"3","label":"submitted"},{"id":"e3-4","source":"3","target":"4","label":"reviewed"},{"id":"e4-5","source":"4","target":"5","label":"yes"},{"id":"e4-6","source":"4","target":"6","label":"no"},{"id":"e5-7","source":"5","target":"7","label":"approved"},{"id":"e6-7","source":"6","target":"7","label":"rejected"}]}',
    },
]


async def generate_flow_bpmn(description: str) -> dict:
    async with _semaphore:
        messages = BPMN_FEW_SHOT + [{'role': 'user', 'content': description}]
        client = _get_client()
        response = await client.messages.create(
            model='claude-sonnet-4-6',
            max_tokens=2048,
            system=BPMN_SYSTEM_PROMPT,
            messages=messages,
        )
        raw = _strip_fences(response.content[0].text)
        return json.loads(raw)


REFINE_SYSTEM_PROMPT = """\
You are a workflow diagram editor. Given an existing workflow diagram and a user instruction, \
return the updated diagram as JSON.

Return ONLY valid JSON — no markdown fences, no explanations.

Schema (same as original):
{
  "title": "short descriptive title",
  "nodes": [
    { "id": "1", "data": { "label": "Step name" }, "position": { "x": 0, "y": 0 } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2", "label": "optional" }
  ]
}

Rules:
- Preserve existing node ids where they still exist in the updated flow
- Assign new unique string ids for any added nodes (continue the sequence)
- Every edge source/target must reference an existing node id in the response
- Keep labels concise (2-6 words)
- Position x/y are layout hints only — space nodes ~120px apart vertically
"""


def _build_refine_prompt(title: str, nodes: list[dict], edges: list[dict], instruction: str) -> str:
    current = json.dumps({'title': title, 'nodes': nodes, 'edges': edges}, indent=2)
    return f'Current workflow:\n{current}\n\nInstruction: {instruction}'


async def refine_flow(title: str, nodes: list[dict], edges: list[dict], instruction: str) -> dict:
    async with _semaphore:
        client = _get_client()
        prompt = _build_refine_prompt(title, nodes, edges, instruction)
        try:
            response = await client.messages.create(
                model='claude-sonnet-4-6',
                max_tokens=2048,
                system=REFINE_SYSTEM_PROMPT,
                messages=[{'role': 'user', 'content': prompt}],
            )
            raw = response.content[0].text
        except (anthropic.BadRequestError, anthropic.AuthenticationError) as e:
            log.warning('Anthropic error during refine (%s)', e)
            raise
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
