import asyncio
import json
import logging
from typing import AsyncGenerator

import anthropic
import httpx

from app.config import settings

log = logging.getLogger(__name__)

_client: anthropic.AsyncAnthropic | None = None
_semaphore = asyncio.Semaphore(3)

TOOLS = [
    {
        'name': 'write_artifact',
        'description': (
            'Write a generated artifact (code file, config, script, or docs) to the execution output. '
            'Use this for every file you generate — YAML, shell scripts, markdown docs, etc.'
        ),
        'input_schema': {
            'type': 'object',
            'properties': {
                'filename': {
                    'type': 'string',
                    'description': 'Filename with extension, e.g. deploy.yml, build.sh, README.md',
                },
                'language': {
                    'type': 'string',
                    'description': 'Language for syntax highlighting: yaml, bash, markdown, python, json, etc.',
                },
                'content': {
                    'type': 'string',
                    'description': 'The full file content to write',
                },
            },
            'required': ['filename', 'language', 'content'],
        },
    },
    {
        'name': 'log_step_analysis',
        'description': 'Log the analysis of a workflow step — what it does, its inputs/outputs, and any concerns.',
        'input_schema': {
            'type': 'object',
            'properties': {
                'step': {'type': 'string', 'description': 'The step name / node label'},
                'action': {'type': 'string', 'description': 'What this step does in plain English'},
                'notes': {'type': 'string', 'description': 'Any implementation notes, dependencies, or concerns'},
            },
            'required': ['step', 'action'],
        },
    },
]

SYSTEM_PROMPT = """\
You are a workflow execution assistant. Given a workflow diagram (title + nodes + edges), \
you analyze the flow and generate executable artifacts.

Guidelines:
- For CI/CD or deployment flows → generate GitHub Actions YAML + a shell script
- For business/approval flows → generate a process documentation markdown + a checklist
- For onboarding or setup flows → generate a step-by-step runbook markdown
- For any flow → always generate at least one practical artifact

Always:
1. Use log_step_analysis for 2-3 key steps to show you understand the flow
2. Use write_artifact for every file you generate (at least one)
3. After all tool calls, write a concise plain-text summary of what was generated

Keep generated files practical and runnable, not just templates.
"""


def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(
            api_key=settings.anthropic_api_key,
            timeout=httpx.Timeout(connect=30, read=600, write=30, pool=30),
        )
    return _client


def _build_flow_description(title: str, nodes: list[dict], edges: list[dict]) -> str:
    node_map = {n['id']: n['data']['label'] for n in nodes}
    lines = [f'Workflow: {title}', '', 'Steps (nodes):']
    for n in nodes:
        lines.append(f'  - [{n["id"]}] {n["data"]["label"]}')
    lines += ['', 'Connections (edges):']
    for e in edges:
        src = node_map.get(e['source'], e['source'])
        tgt = node_map.get(e['target'], e['target'])
        label = f' ({e["label"]})' if e.get('label') else ''
        lines.append(f'  - {src} → {tgt}{label}')
    return '\n'.join(lines)


def _sse(event: dict) -> str:
    return f'data: {json.dumps(event)}\n\n'


def _process_tool_blocks(tool_use_blocks: list) -> tuple[list[dict], list[dict]]:
    """Execute tool calls and return (sse_events, tool_results) to feed back to Claude."""
    sse_events: list[dict] = []
    tool_results: list[dict] = []

    for tool_block in tool_use_blocks:
        name = tool_block.name
        inp = tool_block.input

        if name == 'write_artifact':
            sse_events.append({
                'type': 'tool_result',
                'tool': 'write_artifact',
                'filename': inp.get('filename', 'output'),
                'language': inp.get('language', 'text'),
                'content': inp.get('content', ''),
            })
            tool_results.append({
                'type': 'tool_result',
                'tool_use_id': tool_block.id,
                'content': f'Artifact written: {inp.get("filename")}',
            })

        elif name == 'log_step_analysis':
            sse_events.append({
                'type': 'tool_result',
                'tool': 'log_step_analysis',
                'step': inp.get('step', ''),
                'action': inp.get('action', ''),
                'notes': inp.get('notes', ''),
            })
            tool_results.append({
                'type': 'tool_result',
                'tool_use_id': tool_block.id,
                'content': 'Step analysis logged.',
            })

    return sse_events, tool_results


async def execute_flow(
    title: str,
    nodes: list[dict],
    edges: list[dict],
) -> AsyncGenerator[str, None]:
    async with _semaphore:
        client = _get_client()
        flow_desc = _build_flow_description(title, nodes, edges)
        messages: list[dict] = [{'role': 'user', 'content': flow_desc}]

        yield _sse({'type': 'status', 'text': f'Analyzing "{title}"…'})

        # ── Agentic loop: non-streaming rounds until no more tool_use ────────
        MAX_ROUNDS = 6
        for round_num in range(MAX_ROUNDS):
            try:
                response = await client.messages.create(
                    model='claude-sonnet-4-6',
                    max_tokens=4096,
                    system=SYSTEM_PROMPT,
                    tools=TOOLS,
                    messages=messages,
                )
            except Exception as e:
                yield _sse({'type': 'error', 'text': str(e)})
                return

            assistant_blocks = response.content
            tool_use_blocks = [b for b in assistant_blocks if b.type == 'tool_use']
            text_blocks = [b for b in assistant_blocks if b.type == 'text']

            # Emit any inline text from this round
            for block in text_blocks:
                if block.text.strip():
                    yield _sse({'type': 'token', 'text': block.text})

            # If no tools called, we're done
            if response.stop_reason != 'tool_use' or not tool_use_blocks:
                yield _sse({'type': 'done'})
                return

            # Process tools and emit SSE events
            sse_events, tool_results = _process_tool_blocks(tool_use_blocks)
            for ev in sse_events:
                yield _sse(ev)

            # Add this turn to message history
            messages.append({'role': 'assistant', 'content': assistant_blocks})
            messages.append({'role': 'user', 'content': tool_results})

        # ── Final streaming round for narrative summary ───────────────────────
        yield _sse({'type': 'status', 'text': 'Writing summary…'})

        try:
            async with client.messages.stream(
                model='claude-sonnet-4-6',
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    yield _sse({'type': 'token', 'text': text})
        except Exception as e:
            yield _sse({'type': 'error', 'text': str(e)})
            return

        yield _sse({'type': 'done'})
