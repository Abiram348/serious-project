import pytest
import sys
import pathlib
import os

# Add parent directory to path for imports
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from graph.graph import app as orchestrator_app

@pytest.mark.asyncio
async def test_graph_full_flow():
    """Test the full agent pipeline with a mock user prompt.

    Note: This test requires OLLAMA_BASE_URL environment variable.
    Skip if not available.
    """
    if not os.getenv("OLLAMA_BASE_URL"):
        pytest.skip("OLLAMA_BASE_URL not set, skipping integration test")

    initial_state = {
        "project_id": "test-project-123",
        "user_id": "test-user",
        "user_prompt": "Build a simple todo app with Next.js and Express",
        "status": "PENDING",
        "files": {},
        "task_plan": [],
    }

    result = await orchestrator_app.ainvoke(initial_state)

    # Graph should run without error and preserve project identity
    assert result.get("project_id") == "test-project-123", "project_id should be preserved"

    # Check that the state has some completion indication
    # (actual flags depend on whether LLM calls succeed)
    assert isinstance(result, dict), "Result should be a dictionary"

    # Check that files field exists (may be empty if graph fails)
    files = result.get("files", {})
    assert isinstance(files, dict), "Files should be a dictionary"

    # If any agent completed, at least one flag should be True
    completion_flags = [
        "supervisor_completed",
        "backend_completed",
        "database_completed",
        "devops_completed",
        "frontend_done",
        "qa_completed",
        "review_completed",
        "security_completed",
        "documentation_completed",
    ]
    any_completed = any(result.get(flag) for flag in completion_flags)
    assert any_completed, "At least one agent should have completed"
