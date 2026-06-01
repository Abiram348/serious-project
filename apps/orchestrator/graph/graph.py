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
    return await supervisor.run(state)

async def backend_node(state: ProjectState):
    return await backend.run(state)

async def database_node(state: ProjectState):
    return await database.run(state)

async def devops_node(state: ProjectState):
    return await devops.run(state)

async def frontend_node(state: ProjectState):
    return await frontend.run(state)

async def qa_node(state: ProjectState):
    return await qa.run(state)

async def reviewer_node(state: ProjectState):
    return await reviewer.run(state)

async def security_node(state: ProjectState):
    return await security.run(state)

async def documentation_node(state: ProjectState):
    return await documentation.run(state)

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
# Sequential post‑frontend steps: QA → Reviewer → Security → Documentation
graph.add_edge("frontend", "qa")
graph.add_edge("qa", "reviewer")
graph.add_edge("reviewer", "security")
graph.add_edge("security", "documentation")
graph.add_edge("documentation", END)

# Compile the graph into a runnable object
app = graph.compile()
