# Ollama Cloud Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Anthropic Claude SDK with Ollama Cloud (OpenAI-compatible API) across all 9 SwarmDev agents, using a 3-tier model routing system.

**Architecture:** Swap `anthropic.Anthropic` for `openai.OpenAI` in `BaseAgent`, add a `tier` parameter that maps to env-configured model names (reasoning/code_gen/template), remove the `call_haiku()` method. Each agent declares its tier in `__init__`. The OpenAI SDK calls Ollama Cloud's `/v1/chat/completions` endpoint.

**Tech Stack:** Python, openai SDK, Ollama Cloud API (OpenAI-compatible)

**Spec:** `docs/superpowers/specs/2026-05-28-ollama-cloud-integration-design.md`

---

### Task 1: Rewrite BaseAgent with OpenAI SDK + tier system

**Files:**
- Modify: `apps/orchestrator/agents/base.py`

This is the core change. Replace the Anthropic SDK with OpenAI SDK and add the tier-based model routing.

- [ ] **Step 1: Replace imports and module-level constants**

Replace the anthropic import and model constants with openai + tier config:

```python
import os
import re
import json
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from openai import OpenAI

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "ollama")

TIER_MODELS = {
    "reasoning": os.getenv("OLLAMA_REASONING_MODEL", "llama4"),
    "code_gen": os.getenv("OLLAMA_CODEGEN_MODEL", "codellama"),
    "template": os.getenv("OLLAMA_TEMPLATE_MODEL", "mistral-small"),
}
```

Remove these lines (no longer needed):
```python
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
HAIKU_MODEL = "claude-3-5-haiku-20241022"
```

- [ ] **Step 2: Update `__init__` to accept tier and create OpenAI client**

```python
class BaseAgent(ABC):
    def __init__(self, name: str, system_prompt: str = "", tier: str = "code_gen"):
        self.name = name
        self.system_prompt = system_prompt
        self.tier = tier
        self.model = TIER_MODELS.get(tier, TIER_MODELS["code_gen"])
        self.client = OpenAI(
            base_url=f"{OLLAMA_BASE_URL}/v1",
            api_key=OLLAMA_API_KEY,
        )
```

- [ ] **Step 3: Rewrite `call_llm()` for OpenAI chat completions API**

Replace the Anthropic `messages.create()` call with OpenAI `chat.completions.create()`:

```python
async def call_llm(
    self,
    user_prompt: str,
    system_prompt: str = "",
    max_tokens: int = 4096,
    model: Optional[str] = None,
) -> str:
    """Call Ollama Cloud via OpenAI-compatible API."""
    sys_prompt = system_prompt or self.system_prompt
    messages = []
    if sys_prompt:
        messages.append({"role": "system", "content": sys_prompt})
    messages.append({"role": "user", "content": user_prompt})

    response = self.client.chat.completions.create(
        model=model or self.model,
        max_tokens=max_tokens,
        messages=messages,
    )
    return response.choices[0].message.content
```

Key difference from Anthropic: system prompt moves from a top-level `system` param into the `messages` array.

- [ ] **Step 4: Remove `call_haiku()` method**

Delete the entire `call_haiku` method (lines 48-55 in the original). The tier system replaces it — agents that previously called `call_haiku()` will now call `call_llm()` and get their tier's model automatically.

- [ ] **Step 5: Verify the file is consistent**

Run: `python -c "import ast; ast.parse(open('apps/orchestrator/agents/base.py').read()); print('OK')"`
Expected: `OK` (no syntax errors)

- [ ] **Step 6: Commit**

```bash
git add apps/orchestrator/agents/base.py
git commit -m "feat: replace Anthropic SDK with OpenAI SDK + tiered model routing"
```

---

### Task 2: Add tier params to reasoning agents (Supervisor, Reviewer, Security)

**Files:**
- Modify: `apps/orchestrator/agents/supervisor.py:38`
- Modify: `apps/orchestrator/agents/reviewer.py:28`
- Modify: `apps/orchestrator/agents/security.py:290`

These agents need the strongest reasoning model.

- [ ] **Step 1: Update SupervisorAgent**

In `apps/orchestrator/agents/supervisor.py`, change line 38:

```python
# Before:
class SupervisorAgent(BaseAgent):
    def __init__(self):
        super().__init__("SUPERVISOR", SYSTEM_PROMPT)

# After:
class SupervisorAgent(BaseAgent):
    def __init__(self):
        super().__init__("SUPERVISOR", SYSTEM_PROMPT, tier="reasoning")
```

- [ ] **Step 2: Update ReviewerAgent**

In `apps/orchestrator/agents/reviewer.py`, change line 28-29:

```python
# Before:
class ReviewerAgent(BaseAgent):
    def __init__(self):
        super().__init__("REVIEWER", SYSTEM_PROMPT)

# After:
class ReviewerAgent(BaseAgent):
    def __init__(self):
        super().__init__("REVIEWER", SYSTEM_PROMPT, tier="reasoning")
```

- [ ] **Step 3: Update SecurityAgent**

In `apps/orchestrator/agents/security.py`, change line 290:

```python
# Before (line ~290):
class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__("SECURITY", SYSTEM_PROMPT)

# After:
class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__("SECURITY", SYSTEM_PROMPT, tier="reasoning")
```

- [ ] **Step 4: Verify syntax on all three files**

Run:
```bash
python -c "import ast; ast.parse(open('apps/orchestrator/agents/supervisor.py').read()); print('supervisor OK')"
python -c "import ast; ast.parse(open('apps/orchestrator/agents/reviewer.py').read()); print('reviewer OK')"
python -c "import ast; ast.parse(open('apps/orchestrator/agents/security.py').read()); print('security OK')"
```
Expected: All three print `OK`

- [ ] **Step 5: Commit**

```bash
git add apps/orchestrator/agents/supervisor.py apps/orchestrator/agents/reviewer.py apps/orchestrator/agents/security.py
git commit -m "feat: assign reasoning tier to Supervisor, Reviewer, Security agents"
```

---

### Task 3: Add tier params to code_gen agents (Frontend, Backend, Database, QA)

**Files:**
- Modify: `apps/orchestrator/agents/frontend.py:26`
- Modify: `apps/orchestrator/agents/backend.py:22`
- Modify: `apps/orchestrator/agents/database.py:22`
- Modify: `apps/orchestrator/agents/qa.py:21`

These agents generate code — they get the code-specialized model.

- [ ] **Step 1: Update FrontendAgent**

In `apps/orchestrator/agents/frontend.py`, change line 26-27:

```python
# Before:
class FrontendAgent(BaseAgent):
    def __init__(self):
        super().__init__("FRONTEND", SYSTEM_PROMPT)

# After:
class FrontendAgent(BaseAgent):
    def __init__(self):
        super().__init__("FRONTEND", SYSTEM_PROMPT, tier="code_gen")
```

- [ ] **Step 2: Update BackendAgent**

In `apps/orchestrator/agents/backend.py`, change line 22-23:

```python
# Before:
class BackendAgent(BaseAgent):
    def __init__(self):
        super().__init__("BACKEND", SYSTEM_PROMPT)

# After:
class BackendAgent(BaseAgent):
    def __init__(self):
        super().__init__("BACKEND", SYSTEM_PROMPT, tier="code_gen")
```

- [ ] **Step 3: Update DatabaseAgent**

In `apps/orchestrator/agents/database.py`, change line 22-23:

```python
# Before:
class DatabaseAgent(BaseAgent):
    def __init__(self):
        super().__init__("DATABASE", SYSTEM_PROMPT)

# After:
class DatabaseAgent(BaseAgent):
    def __init__(self):
        super().__init__("DATABASE", SYSTEM_PROMPT, tier="code_gen")
```

- [ ] **Step 4: Update QAAgent**

In `apps/orchestrator/agents/qa.py`, change line 21-22:

```python
# Before:
class QAAgent(BaseAgent):
    def __init__(self):
        super().__init__("QA", SYSTEM_PROMPT)

# After:
class QAAgent(BaseAgent):
    def __init__(self):
        super().__init__("QA", SYSTEM_PROMPT, tier="code_gen")
```

- [ ] **Step 5: Verify syntax on all four files**

Run:
```bash
python -c "
import ast
for f in ['frontend','backend','database','qa']:
    ast.parse(open(f'apps/orchestrator/agents/{f}.py').read())
    print(f'{f} OK')
"
```
Expected: All four print `OK`

- [ ] **Step 6: Commit**

```bash
git add apps/orchestrator/agents/frontend.py apps/orchestrator/agents/backend.py apps/orchestrator/agents/database.py apps/orchestrator/agents/qa.py
git commit -m "feat: assign code_gen tier to Frontend, Backend, Database, QA agents"
```

---

### Task 4: Update template-tier agents (DevOps, Documentation)

**Files:**
- Modify: `apps/orchestrator/agents/devops.py:33`
- Modify: `apps/orchestrator/agents/documentation.py:37`

These agents default to `template` tier (since `BaseAgent.__init__` has `tier="code_gen"` as default, they need explicit `tier="template"`). Also replace `call_haiku()` calls with `call_llm()`.

- [ ] **Step 1: Update DevOpsAgent — add tier and swap call_haiku → call_llm**

In `apps/orchestrator/agents/devops.py`:

```python
# Before (lines 22-23):
class DevOpsAgent(BaseAgent):
    def __init__(self):
        super().__init__("DEVOPS", SYSTEM_PROMPT)

# After:
class DevOpsAgent(BaseAgent):
    def __init__(self):
        super().__init__("DEVOPS", SYSTEM_PROMPT, tier="template")
```

And on line 33, change `call_haiku` to `call_llm`:

```python
# Before:
response = await self.call_haiku(
    f"Generate DevOps configurations for this project:...

# After:
response = await self.call_llm(
    f"Generate DevOps configurations for this project:...
```

- [ ] **Step 2: Update DocumentationAgent — add tier and swap call_haiku → call_llm**

In `apps/orchestrator/agents/documentation.py`:

```python
# Before (lines 22-23):
class DocumentationAgent(BaseAgent):
    def __init__(self):
        super().__init__("DOCUMENTATION", SYSTEM_PROMPT)

# After:
class DocumentationAgent(BaseAgent):
    def __init__(self):
        super().__init__("DOCUMENTATION", SYSTEM_PROMPT, tier="template")
```

And on line 37, change `call_haiku` to `call_llm`:

```python
# Before:
response = await self.call_haiku(
    f"""Generate comprehensive documentation...

# After:
response = await self.call_llm(
    f"""Generate comprehensive documentation...
```

- [ ] **Step 3: Verify syntax**

Run:
```bash
python -c "import ast; ast.parse(open('apps/orchestrator/agents/devops.py').read()); print('devops OK')"
python -c "import ast; ast.parse(open('apps/orchestrator/agents/documentation.py').read()); print('docs OK')"
```
Expected: Both print `OK`

- [ ] **Step 4: Commit**

```bash
git add apps/orchestrator/agents/devops.py apps/orchestrator/agents/documentation.py
git commit -m "feat: assign template tier to DevOps and Documentation agents, replace call_haiku with call_llm"
```

---

### Task 5: Update requirements.txt and env files

**Files:**
- Modify: `apps/orchestrator/requirements.txt`
- Modify: `apps/orchestrator/.env`
- Modify: `apps/orchestrator/.env.example`

- [ ] **Step 1: Update requirements.txt**

Replace the anthropic line with openai:

```
# Before (line 6-7):
# AI/LLM — Claude API
anthropic>=0.30.0

# After (line 6-7):
# AI/LLM — Ollama Cloud (OpenAI-compatible)
openai>=1.0.0
```

- [ ] **Step 2: Update .env.example**

Replace the Anthropic section with Ollama Cloud config:

```bash
# ─────────────── DATABASE ───────────────
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
REDIS_URL=redis://localhost:6379

# ─────────────── OLLAMA CLOUD ───────────────
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=...
OLLAMA_REASONING_MODEL=llama4
OLLAMA_CODEGEN_MODEL=codellama
OLLAMA_TEMPLATE_MODEL=mistral-small

# ─────────────── E2B ───────────────
E2B_API_KEY=e2b_xxx

# ─────────────── QDRANT (Vector DB) ───────────────
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# ─────────────── API ───────────────
API_URL=http://localhost:3001
API_SECRET=dev-secret

# ─────────────── SOCKET ───────────────
SOCKET_URL=http://localhost:3001

# ─────────────── MISC ───────────────
PORT=8000
```

- [ ] **Step 3: Update .env**

The `.env` file already has Ollama config. Just remove the old Anthropic lines if present and add the tier model vars if missing:

```bash
# Remove these lines if present:
# ANTHROPIC_API_KEY=...
# ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Ensure these are present (keep existing values):
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=0205a683563642bdbbb154553cc20482.tptIkl228xAKcDNJ-DLrGBqp
OLLAMA_REASONING_MODEL=llama4
OLLAMA_CODEGEN_MODEL=codellama
OLLAMA_TEMPLATE_MODEL=mistral-small
```

- [ ] **Step 4: Commit**

```bash
git add apps/orchestrator/requirements.txt apps/orchestrator/.env apps/orchestrator/.env.example
git commit -m "chore: swap anthropic for openai in deps, update env vars for Ollama Cloud tier config"
```

---

### Task 6: Install dependencies and smoke test

**Files:**
- None (verification only)

- [ ] **Step 1: Install updated dependencies**

Run:
```bash
cd apps/orchestrator && source venv/bin/activate && pip install -r requirements.txt
```
Expected: `openai` installs successfully, no errors.

- [ ] **Step 2: Verify BaseAgent can be imported**

Run:
```bash
cd apps/orchestrator && source venv/bin/activate && python -c "
from agents.base import BaseAgent, TIER_MODELS
print('TIER_MODELS:', TIER_MODELS)
print('BaseAgent import OK')
"
```
Expected: Prints the tier model mapping and `BaseAgent import OK`.

- [ ] **Step 3: Verify all agents can be imported**

Run:
```bash
cd apps/orchestrator && source venv/bin/activate && python -c "
from agents.supervisor import SupervisorAgent
from agents.frontend import FrontendAgent
from agents.backend import BackendAgent
from agents.database import DatabaseAgent
from agents.devops import DevOpsAgent
from agents.qa import QAAgent
from agents.reviewer import ReviewerAgent
from agents.security import SecurityAgent
from agents.documentation import DocumentationAgent

agents = [
    SupervisorAgent(),
    FrontendAgent(),
    BackendAgent(),
    DatabaseAgent(),
    DevOpsAgent(),
    QAAgent(),
    ReviewerAgent(),
    SecurityAgent(),
    DocumentationAgent(),
]

for a in agents:
    print(f'{a.name}: tier={a.tier}, model={a.model}')
print('All agents imported OK')
"
```
Expected: Prints each agent's name, tier, and model, then `All agents imported OK`.

- [ ] **Step 4: Run existing tests**

```bash
cd apps/orchestrator && source venv/bin/activate && python -m pytest tests/ -v
```
Expected: Tests pass (they don't call the LLM — they test agent structure and graph logic).

- [ ] **Step 5: Commit (if any fixes from test run)**

Only if tests revealed issues that needed fixes.

---

### Task 7: Final verification — end-to-end import chain

**Files:**
- None (verification only)

- [ ] **Step 1: Verify the orchestrator starts without import errors**

Run:
```bash
cd apps/orchestrator && source venv/bin/activate && timeout 5 python -c "
from main import app
print('FastAPI app created OK')
" 2>&1 || true
```
Expected: `FastAPI app created OK` (may show uvicorn warnings, that's fine).

- [ ] **Step 2: Verify graph import works**

Run:
```bash
cd apps/orchestrator && source venv/bin/activate && python -c "
from graph.graph import app
from graph.state import ProjectState
print('Graph:', type(app).__name__)
print('Graph import OK')
"
```
Expected: Prints graph type name and `Graph import OK`.

- [ ] **Step 3: Confirm all commits are in order**

Run:
```bash
git log --oneline -6
```
Expected: 6 commits (tasks 1-6), no uncommitted changes related to this feature.
