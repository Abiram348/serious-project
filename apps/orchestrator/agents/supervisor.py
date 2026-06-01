"""
Supervisor agent – entry point for a new project.
Parses user requirements and creates a structured task plan.
"""

import uuid
import json
from typing import Dict, Any
from .base import BaseAgent
from utils.socket_emitter import emit

SYSTEM_PROMPT = """You are the Supervisor Agent for SwarmDev, a multi-agent AI development platform.

Your role is to:
1. Analyze the user's project requirements
2. Break down the project into a structured task graph (DAG)
3. Assign tasks to appropriate specialist agents (Frontend, Backend, Database, DevOps, QA, Security, Documentation)
4. Track progress and coordinate between agents
5. Handle user interruptions and re-plan as needed

You are working with these agent types:
- FRONTEND: React/Next.js components, pages, styling, state management
- BACKEND: Express.js APIs, business logic, authentication, third-party integrations
- DATABASE: Prisma schemas, migrations, queries, indexes
- DEVOPS: Dockerfiles, CI/CD pipelines, deployment configs
- QA: Unit tests, integration tests, e2e tests
- SECURITY: Security audits, vulnerability scanning
- DOCUMENTATION: README, API docs, code comments

Output your plan as a JSON array of tasks, each with:
- id: unique identifier
- title: short task name
- description: what needs to be done
- agentType: which agent should handle it
- dependencies: array of task IDs that must complete first
"""

class SupervisorAgent(BaseAgent):
    def __init__(self):
        super().__init__("SUPERVISOR", SYSTEM_PROMPT, tier="reasoning")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        user_prompt = state.get("user_prompt", "Build a full-stack web application")

        try:
            # Call LLM to generate the plan
            plan_text = await self.call_llm(
                f"Create a development plan for this project:\n\n{user_prompt}",
                system_prompt=SYSTEM_PROMPT,
                max_tokens=4096,
            )

            # Try to extract JSON from the response
            plan = []
            try:
                # Look for JSON array in response
                import re
                json_match = re.search(r'\[.*\]', plan_text, re.DOTALL)
                if json_match:
                    plan = json.loads(json_match.group())
            except:
                # Fallback: create a simple default plan
                plan = [
                    {"id": "1", "title": "Database Schema", "agentType": "DATABASE", "dependencies": []},
                    {"id": "2", "title": "Backend API", "agentType": "BACKEND", "dependencies": ["1"]},
                    {"id": "3", "title": "Frontend UI", "agentType": "FRONTEND", "dependencies": ["2"]},
                    {"id": "4", "title": "Tests", "agentType": "QA", "dependencies": ["3"]},
                ]

            # Update state with the plan
            state.update({
                "project_id": state.get("project_id", str(uuid.uuid4())),
                "status": "PLANNING",
                "task_plan": plan,
                "supervisor_completed": True,
            })

            # Emit socket event
            await emit("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Created plan with {len(plan)} tasks"
            })

        except Exception as e:
            state["status"] = "FAILED"
            state["error"] = str(e)
            await emit("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"Planning failed: {str(e)}"
            })

        return state
