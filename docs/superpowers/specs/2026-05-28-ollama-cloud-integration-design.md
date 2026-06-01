# Ollama Cloud Integration for SwarmDev

**Date:** 2026-05-28
**Decision:** Replace Anthropic Claude with Ollama Cloud, tiered model routing across all 9 agents.

## Summary

SwarmDev's orchestrator currently hardcodes Anthropic's SDK (`anthropic.Anthropic`) in `BaseAgent`, with two model tiers (Sonnet for reasoning, Haiku for templates). This spec replaces Anthropic entirely with Ollama Cloud via its OpenAI-compatible API, using a 3-tier model routing system.

## Architecture

### Before

```
BaseAgent.__init__
  → anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
  → self.model = ANTHROPIC_MODEL (Sonnet)

call_llm()         → anthropic_client.messages.create(model=Sonnet)
call_haiku()       → anthropic_client.messages.create(model=Haiku)
```

### After

```
BaseAgent.__init__(name, system_prompt, tier="code_gen")
  → OpenAI(base_url=OLLAMA_BASE_URL, api_key=OLLAMA_API_KEY)
  → self.model = TIER_MODELS[tier]

call_llm()         → openai_client.chat.completions.create(model=tier_model)
call_haiku()       → REMOVED (tier system replaces it)
```

### Tier → Model Mapping

| Tier | Agents | Env Var | Default |
|------|--------|---------|---------|
| `reasoning` | Supervisor, Reviewer, Security | `OLLAMA_REASONING_MODEL` | `llama4` |
| `code_gen` | Frontend, Backend, Database, QA | `OLLAMA_CODEGEN_MODEL` | `codellama` |
| `template` | DevOps, Documentation | `OLLAMA_TEMPLATE_MODEL` | `mistral-small` |

Each tier is an env var so models can be swapped without code changes.

## File Changes

### Modified (12 files)

| File | Change |
|------|--------|
| `apps/orchestrator/agents/base.py` | Replace `anthropic` import with `openai`. Add `TIER_MODELS` dict and `tier` param to `__init__`. Rewrite `call_llm()` to use OpenAI chat completions API. Remove `call_haiku()`. |
| `apps/orchestrator/agents/supervisor.py` | Add `tier="reasoning"` to `super().__init__()` |
| `apps/orchestrator/agents/reviewer.py` | Add `tier="reasoning"` to `super().__init__()` |
| `apps/orchestrator/agents/security.py` | Add `tier="reasoning"` to `super().__init__()` |
| `apps/orchestrator/agents/frontend.py` | Add `tier="code_gen"` to `super().__init__()` |
| `apps/orchestrator/agents/backend.py` | Add `tier="code_gen"` to `super().__init__()` |
| `apps/orchestrator/agents/database.py` | Add `tier="code_gen"` to `super().__init__()` |
| `apps/orchestrator/agents/qa.py` | Add `tier="code_gen"` to `super().__init__()` |
| `apps/orchestrator/agents/devops.py` | Replace `call_haiku()` with `call_llm()` — already defaults to `template` tier |
| `apps/orchestrator/agents/documentation.py` | Replace `call_haiku()` with `call_llm()` — already defaults to `template` tier |
| `apps/orchestrator/requirements.txt` | Replace `anthropic>=0.30.0` with `openai>=1.0.0` |
| `apps/orchestrator/.env` | Remove `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`. Add `OLLAMA_REASONING_MODEL`, `OLLAMA_CODEGEN_MODEL`, `OLLAMA_TEMPLATE_MODEL`. |

### Unchanged

- All agent `run()` methods
- LangGraph state machine (`graph/graph.py`, `graph/state.py`)
- File parsing utilities (`_parse_files`, `_parse_json_from_response`)
- Inter-agent communication (`send_message_to_agent`, `query_agent`, etc.)
- Socket event emission (`emit_event`, `log`)
- FastAPI routes (`main.py`)
- BullMQ worker (`worker.py`)

## Env Vars

```bash
# Required
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=...

# Tier model selection (all optional, defaults shown)
OLLAMA_REASONING_MODEL=llama4
OLLAMA_CODEGEN_MODEL=codellama
OLLAMA_TEMPLATE_MODEL=mistral-small
```

## API Compatibility

Ollama Cloud exposes an OpenAI-compatible `/v1/chat/completions` endpoint. The `call_llm()` method sends:

```python
response = self.client.chat.completions.create(
    model=self.model,
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ],
    max_tokens=max_tokens,
)
return response.choices[0].message.content
```

System prompts move from Anthropic's top-level `system` param into the messages array (standard OpenAI format).

## Rollback Path

To revert to Anthropic: restore `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` env vars, revert `base.py` to the anthropic SDK import, and remove the `tier` params from agent constructors. No data migration needed — it's a pure code/config change.
