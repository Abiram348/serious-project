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
        result = await orchestrator_app.ainvoke(initial_state)
        _workflows[project_id] = {
            "status": result.get("status", "COMPLETED"),
            "files": result.get("files", {}),
            "task_plan": result.get("task_plan", []),
            "completed_agents": [
                k.replace("_completed", "").replace("_done", "").upper()
                for k in result.keys()
                if k.endswith("_completed") or k.endswith("_done")
            ],
        }

        # Surface errors if the graph reports failure without an error string.
        if _workflows[project_id]["status"] == "FAILED" and not result.get("error"):
            _workflows[project_id]["error"] = "Pipeline failed without error details"
        elif result.get("error"):
            _workflows[project_id]["error"] = result.get("error")

        # Save files to API database
        files = result.get("files", {})
        if files:
            await _save_files_to_api(project_id, files)

    except Exception as e:
        _workflows[project_id] = {
            "status": "FAILED",
            "error": str(e),
            "files": {},
            "completed_agents": [],
        }
        print("Pipeline failed with exception:")
        traceback.print_exc()


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


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
