"""
SwarmDev Orchestration Engine
Main FastAPI application entry point
"""

import os
import json
import asyncio
import traceback
from fastapi import FastAPI, Header, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from dotenv import load_dotenv
from openai import AsyncOpenAI
from typing import Dict, Any

load_dotenv()

app = FastAPI(
    title="SwarmDev Orchestration Engine",
    description="Multi-agent orchestration engine for SwarmDev platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_SECRET = os.getenv("API_SECRET")

# Friendly model name -> actual Ollama model mapping
MODEL_ALIASES = {
    "llama4": os.getenv("OLLAMA_REASONING_MODEL", "deepseek-v4-pro:cloud"),
    "codellama": os.getenv("OLLAMA_CODEGEN_MODEL", "qwen3.5:397b-cloud"),
    "kimi": os.getenv("OLLAMA_CODEGEN_MODEL", "qwen3.5:397b-cloud"),
    "mistral-small": os.getenv("OLLAMA_TEMPLATE_MODEL", "gpt-oss:120b-cloud"),
    "gpt-oss": os.getenv("OLLAMA_TEMPLATE_MODEL", "gpt-oss:120b-cloud"),
}


def resolve_model_name(name: str) -> str:
    """Resolve a friendly model alias to the actual Ollama model name."""
    return MODEL_ALIASES.get(name, name)


# In-memory store for workflow state and results
_workflows: Dict[str, Dict[str, Any]] = {}


async def _save_files_to_api(project_id: str, files: Dict[str, Any]):
    """Save generated files to the API database."""
    api_url = os.getenv("API_URL", "http://localhost:3001")
    api_secret = os.getenv("API_SECRET", "dev-secret")

    import httpx
    async with httpx.AsyncClient() as client:
        for path, file_data in files.items():
            content = file_data.get("content", "") if isinstance(file_data, dict) else file_data
            language = file_data.get("language", "text") if isinstance(file_data, dict) else "text"
            created_by = file_data.get("createdBy", "UNKNOWN") if isinstance(file_data, dict) else "UNKNOWN"

            try:
                await client.post(
                    f"{api_url}/api/internal/projects/{project_id}/files/{path.lstrip('/')}",
                    json={"content": content, "language": language, "createdBy": created_by},
                    headers={
                        "X-API-SECRET": api_secret,
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )
            except Exception as e:
                print(f"Failed to save file {path} to database: {e}")


async def _update_project_status(project_id: str, status: str, error: str = ""):
    """Update project status in the API database after pipeline completion."""
    api_url = os.getenv("API_URL", "http://localhost:3001")
    api_secret = os.getenv("API_SECRET", "dev-secret")

    import httpx
    try:
        async with httpx.AsyncClient() as client:
            payload = {"status": status}
            if error:
                payload["error"] = error
            await client.patch(
                f"{api_url}/api/internal/projects/{project_id}/status",
                json=payload,
                headers={
                    "X-API-SECRET": api_secret,
                    "Content-Type": "application/json",
                },
                timeout=30.0,
            )
            print(f"[orchestrator] Updated project {project_id} status to {status}")
    except Exception as e:
        print(f"[orchestrator] Failed to update project status for {project_id}: {e}")


async def _run_pipeline(project_id: str, user_prompt: str, user_id: str, tech_stack: str = "{}"):
    """Run the full LangGraph agent pipeline in the background."""
    import sys, pathlib
    sys.path.append(str(pathlib.Path(__file__).parent))
    from graph.graph import app as orchestrator_app
    from graph.state import ProjectState

    _workflows[project_id] = {"status": "PLANNING", "files": {}, "completed_agents": []}

    initial_state: ProjectState = {
        "project_id": project_id,
        "user_id": user_id,
        "user_prompt": user_prompt,
        "status": "PLANNING",
        "files": {},
        "task_plan": [],
    }

    if tech_stack and tech_stack != "{}":
        try:
            initial_state["tech_stack"] = json.loads(tech_stack)
        except json.JSONDecodeError:
            pass

    try:
        # Mark as in-progress while pipeline runs
        _workflows[project_id]["status"] = "IN_PROGRESS"

        result = await orchestrator_app.ainvoke(initial_state)

        # Derive final status: if graph finished without error, it's COMPLETED.
        # The state may still say "PLANNING" if no agent updated it.
        graph_status = result.get("status", "")
        has_error = bool(result.get("error", ""))
        if has_error or graph_status == "FAILED":
            final_status = "FAILED"
        elif graph_status and graph_status != "PLANNING":
            final_status = graph_status
        else:
            final_status = "COMPLETED"

        _workflows[project_id] = {
            "status": final_status,
            "files": result.get("files", {}),
            "task_plan": result.get("task_plan", []),
            "completed_agents": [
                k.replace("_completed", "").replace("_done", "").upper()
                for k in result.keys()
                if k.endswith("_completed") or k.endswith("_done")
            ],
        }

        if has_error:
            _workflows[project_id]["error"] = result.get("error")

        # Save files to API database
        files = result.get("files", {})
        if files:
            await _save_files_to_api(project_id, files)

        # Update project status in API database
        final_error = _workflows[project_id].get("error", "")
        await _update_project_status(project_id, final_status, final_error)

    except Exception as e:
        _workflows[project_id] = {
            "status": "FAILED",
            "error": str(e),
            "files": {},
            "completed_agents": [],
        }
        print("Pipeline failed with exception:")
        traceback.print_exc()
        await _update_project_status(project_id, "FAILED", str(e))


@app.get("/")
async def root():
    return {"message": "SwarmDev Orchestration Engine is running!"}


@app.get("/health")
async def health_check():
    return {"status": "OK", "timestamp": "2026-05-27T00:00:00Z"}


@app.post("/projects/{project_id}/agents/start")
async def start_agents(
    project_id: str,
    background_tasks: BackgroundTasks,
    secret: str = Header(..., alias="X-API-SECRET"),
    user_id: str = Header(..., alias="X-USER-ID"),
    user_prompt: str = Header(..., alias="X-USER-PROMPT"),
    tech_stack: str = Header(default="{}", alias="X-TECH-STACK"),
):
    if API_SECRET is None or secret != API_SECRET:
        raise HTTPException(status_code=403, detail="Invalid API secret")

    # Return immediately, run pipeline in background
    background_tasks.add_task(_run_pipeline, project_id, user_prompt, user_id, tech_stack)

    _workflows[project_id] = {"status": "PLANNING", "files": {}, "completed_agents": []}

    return {
        "project_id": project_id,
        "status": "PLANNING",
        "message": "Agent pipeline started in background",
    }


@app.get("/projects/{project_id}/status")
async def project_status(project_id: str, secret: str = Header(..., alias="X-API-SECRET")):
    if API_SECRET is None or secret != API_SECRET:
        raise HTTPException(status_code=403, detail="Invalid API secret")

    workflow = _workflows.get(project_id)
    if not workflow:
        return {"project_id": project_id, "status": "UNKNOWN"}

    return {
        "project_id": project_id,
        "status": workflow.get("status", "UNKNOWN"),
        "completed_agents": workflow.get("completed_agents", []),
        "error": workflow.get("error"),
        "file_count": len(workflow.get("files", {})),
    }


@app.get("/projects/{project_id}/files")
async def project_files(project_id: str, secret: str = Header(..., alias="X-API-SECRET")):
    if API_SECRET is None or secret != API_SECRET:
        raise HTTPException(status_code=403, detail="Invalid API secret")

    workflow = _workflows.get(project_id)
    if not workflow:
        return {"project_id": project_id, "files": {}}

    return {"project_id": project_id, "files": workflow.get("files", {})}


@app.post("/chat")
async def chat(
    request: Dict[str, Any],
    secret: str = Header(..., alias="X-API-SECRET"),
):
    """Handle a chat message from the user and return an agent response.

    Request body:
        project_id: str
        content: str
        target_agent: Optional[str] — explicit agent override
        model: Optional[str] — explicit model override
    """
    if API_SECRET is None or secret != API_SECRET:
        raise HTTPException(status_code=403, detail="Invalid API secret")

    project_id = request.get("project_id")
    content = request.get("content", "")
    target_agent = request.get("target_agent")
    model_override = request.get("model")

    if not project_id or not content:
        raise HTTPException(status_code=400, detail="project_id and content are required")

    from agents.chat_router import ChatRouter

    # Parse @mention if no explicit target_agent
    if not target_agent:
        target_agent, clean_content = ChatRouter.parse_mention(content)
        if target_agent:
            content = clean_content

    # Default to SUPERVISOR if no target
    target_agent = target_agent or "SUPERVISOR"

    # Load model preferences
    model_prefs = await ChatRouter.load_model_preferences(project_id)
    selected_model = model_override or model_prefs.get(target_agent, "codellama")

    # Resolve friendly model aliases to actual Ollama model names
    selected_model = resolve_model_name(selected_model)

    # Load chat history for context
    history = await ChatRouter.load_chat_history(project_id, limit=10)
    history_messages = ChatRouter.format_history_for_llm(history)

    # Build system prompt for the target agent
    system_prompt = ChatRouter.build_system_prompt_for_agent(target_agent)

    # Create Ollama client directly
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_api_key = os.getenv("OLLAMA_API_KEY", "ollama")
    client = AsyncOpenAI(
        base_url=f"{ollama_base_url}/v1",
        api_key=ollama_api_key,
    )

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.extend(history_messages)
    messages.append({"role": "user", "content": content})

    try:
        response = await client.chat.completions.create(
            model=selected_model,
            max_tokens=4096,
            messages=messages,
        )
        msg = response.choices[0].message
        content_text = msg.content or ""
        reasoning = getattr(msg, "reasoning", None) or ""
        agent_response = content_text if content_text.strip() else reasoning
    except Exception as e:
        agent_response = f"❌ Error: Failed to get response from {target_agent} ({selected_model}). {str(e)}"

    return {
        "project_id": project_id,
        "agent": target_agent,
        "model": selected_model,
        "user_message": content,
        "agent_response": agent_response,
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
