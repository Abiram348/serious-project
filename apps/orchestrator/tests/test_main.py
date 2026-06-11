import os
import pytest
import sys
import pathlib

# Add parent directory to path for imports
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    """Create test client."""
    with TestClient(app) as client:
        yield client


def test_health_check(client):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "OK"


def test_root_endpoint(client):
    """Test root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    assert "SwarmDev" in response.json()["message"]


def test_start_agents_success(client):
    """Test starting agent pipeline with valid secret.

    Note: This test requires OLLAMA_BASE_URL environment variable.
    Skip if not available.
    """
    if not os.getenv("OLLAMA_BASE_URL"):
        pytest.skip("OLLAMA_BASE_URL not set, skipping integration test")

    secret = os.getenv("API_SECRET", "dev-secret")
    response = client.post(
        "/projects/test123/agents/start",
        headers={
            "X-API-SECRET": secret,
            "X-USER-ID": "test-user",
            "X-USER-PROMPT": "Build a simple todo app",
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == "test123"
    assert data["status"] == "PLANNING"
    assert "message" in data



def test_start_agents_invalid_secret(client):
    """Test starting agent pipeline with invalid secret."""
    # Test with invalid secret but valid other headers
    response = client.post(
        "/projects/test123/agents/start",
        headers={
            "X-API-SECRET": "invalid-secret",
            "X-USER-ID": "test-user",
            "X-USER-PROMPT": "Build a simple todo app",
        }
    )
    assert response.status_code == 403
