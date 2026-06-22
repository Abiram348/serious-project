"""
LangGraph DAG definition for SwarmDev orchestration.
The graph composes agents into a workflow.
"""

import sys, pathlib
sys.path.append(str(pathlib.Path(__file__).parent.parent))

from langgraph.graph import StateGraph, END, START
from agents.supervisor import SupervisorAgent
from agents.frontend import FrontendAgent
from agents.backend import BackendAgent
from agents.database import DatabaseAgent
from agents.devops import DevOpsAgent
from agents.qa import QAAgent
from agents.reviewer import ReviewerAgent
from agents.security import SecurityAgent
from agents.documentation import DocumentationAgent
from .state import ProjectState

# Instantiate agents
supervisor = SupervisorAgent()
frontend = FrontendAgent()
backend = BackendAgent()
database = DatabaseAgent()
devops = DevOpsAgent()
qa = QAAgent()
reviewer = ReviewerAgent()
security = SecurityAgent()
documentation = DocumentationAgent()

# Async node definitions that await the agent runs and return the updated state
async def supervisor_node(state: ProjectState):
    print(f"[graph] supervisor_node entered, project={state.get('project_id')}", flush=True)
    result = await supervisor.run(state)
    print(f"[graph] supervisor_node done, status={result.get('status')}", flush=True)
    return result

async def backend_node(state: ProjectState):
    print(f"[graph] backend_node entered", flush=True)
    result = await backend.run(state)
    print(f"[graph] backend_node done", flush=True)
    return result

async def database_node(state: ProjectState):
    print(f"[graph] database_node entered", flush=True)
    result = await database.run(state)
    print(f"[graph] database_node done", flush=True)
    return result

async def devops_node(state: ProjectState):
    print(f"[graph] devops_node entered", flush=True)
    result = await devops.run(state)
    print(f"[graph] devops_node done", flush=True)
    return result

async def frontend_node(state: ProjectState):
    print(f"[graph] frontend_node entered", flush=True)
    result = await frontend.run(state)
    print(f"[graph] frontend_node done", flush=True)
    return result

async def qa_node(state: ProjectState):
    print(f"[graph] qa_node entered", flush=True)
    result = await qa.run(state)
    print(f"[graph] qa_node done", flush=True)
    return result

async def reviewer_node(state: ProjectState):
    print(f"[graph] reviewer_node entered", flush=True)
    result = await reviewer.run(state)
    print(f"[graph] reviewer_node done", flush=True)
    return result

async def security_node(state: ProjectState):
    print(f"[graph] security_node entered", flush=True)
    result = await security.run(state)
    print(f"[graph] security_node done", flush=True)
    return result

async def documentation_node(state: ProjectState):
    print(f"[graph] documentation_node entered", flush=True)
    result = await documentation.run(state)
    print(f"[graph] documentation_node done", flush=True)
    return result

async def index_node(state: ProjectState):
    """Index all generated files into Qdrant vector database for RAG."""
    import os
    if not os.getenv("QDRANT_URL"):
        return state
    print(f"[graph] index_node entered", flush=True)
    try:
        # Use supervisor instance (any agent works since method is on BaseAgent)
        ok = await supervisor.index_project_files(state)
        if ok:
            print(f"[graph] index_node: Qdrant indexing complete", flush=True)
    except Exception as e:
        print(f"[graph] index_node: indexing failed: {e}", flush=True)
    return state

# A simple pass‑through node used to join the parallel branches before the frontend step
def pre_frontend_node(state: ProjectState):
    return state

# Build the graph
graph = StateGraph(ProjectState)
# Register all nodes first
graph.add_node("supervisor", supervisor_node)
graph.add_node("backend", backend_node)
graph.add_node("database", database_node)
graph.add_node("devops", devops_node)
graph.add_node("pre_frontend", pre_frontend_node)
graph.add_node("frontend", frontend_node)
graph.add_node("qa", qa_node)
graph.add_node("reviewer", reviewer_node)
graph.add_node("security", security_node)
graph.add_node("documentation", documentation_node)
graph.add_node("index", index_node)

# Define edges (entry point and workflow)
graph.add_edge(START, "supervisor")
# Parallel branches from supervisor
graph.add_edge("supervisor", "backend")
graph.add_edge("supervisor", "database")
graph.add_edge("supervisor", "devops")
# Converge parallel branches
graph.add_edge("backend", "pre_frontend")
graph.add_edge("database", "pre_frontend")
graph.add_edge("devops", "pre_frontend")
# Frontend after convergence
graph.add_edge("pre_frontend", "frontend")
# Sequential post‑frontend steps: QA → Reviewer → Security → Documentation → Index
graph.add_edge("frontend", "qa")
graph.add_edge("qa", "reviewer")
graph.add_edge("reviewer", "security")
graph.add_edge("security", "documentation")
graph.add_edge("documentation", "index")
graph.add_edge("index", END)

# Compile the graph into a runnable object
app = graph.compile()
