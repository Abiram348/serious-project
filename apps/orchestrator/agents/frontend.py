"""
Frontend agent – generates Next.js/React UI components and pages.
Uses inter-agent communication to get backend API context.
"""

import json
from typing import Dict, Any
from .base import BaseAgent

SYSTEM_PROMPT = """You are the Frontend Agent for SwarmDev.

Your role is to:
1. Build Next.js 14 (App Router) components and pages
2. Implement TailwindCSS styling and shadcn/ui components
3. Handle state management with Zustand/Context
4. Connect UI to API endpoints - match the backend API contracts exactly
5. Build responsive, accessible interfaces

Use the provided backend context to ensure your frontend types match the backend API.
Output generated files as:
FILE: path/to/file.tsx
[file content]
"""

class FrontendAgent(BaseAgent):
    def __init__(self):
        super().__init__("FRONTEND", SYSTEM_PROMPT, tier="code_gen")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        task_plan = state.get("task_plan", [])
        project_id = state.get("project_id", "unknown")

        # Inter-agent communication: get context from other agents
        backend_files = self.get_files_by_agent(state, "BACKEND")
        database_files = self.get_files_by_agent(state, "DATABASE")

        # Query specific information from backend
        api_routes = self.query_agent(state, "BACKEND", "API routes endpoints")
        data_models = self.query_agent(state, "DATABASE", "database models schema types")

        # Build backend context for frontend integration
        backend_context = self._build_backend_context(backend_files, database_files)

        try:
            await self.log(state, "INFO", "Starting frontend code generation")

            # Call Claude with full context including backend integration info
            response = await self.call_llm(
                self._build_prompt(task_plan, backend_context, api_routes, data_models),
                max_tokens=8192  # More tokens for code generation
            )

            # Parse generated files
            files = self._parse_files(response)

            # Write files to state
            await self.write_files_to_state(state, files, self.name)

            # Update state
            state.update({
                "frontend_done": True,
                "frontend_output": response,
            })

            await self.log(state, "INFO", f"Frontend code generated ({len(files)} files)")

            # Emit socket event
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Frontend code generated ({len(files)} files)",
                "projectId": project_id
            })

        except Exception as e:
            state["error"] = str(e)
            await self.log(state, "ERROR", f"Frontend generation failed: {str(e)}")
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"Frontend failed: {str(e)}",
                "projectId": project_id
            })

        return state

    def _build_backend_context(
        self,
        backend_files: Dict[str, str],
        database_files: Dict[str, str]
    ) -> str:
        """Build context string from backend and database files."""
        context_parts = []

        if backend_files:
            context_parts.append("## Backend Files")
            for path, content in backend_files.items():
                context_parts.append(f"### {path}\n{content}")

        if database_files:
            context_parts.append("## Database Schema")
            for path, content in database_files.items():
                context_parts.append(f"### {path}\n{content}")

        return "\n\n".join(context_parts)

    def _build_prompt(
        self,
        task_plan: list,
        backend_context: str,
        api_routes: str,
        data_models: str,
    ) -> str:
        """Build prompt with all context for frontend generation."""
        return f"""
Generate frontend code based on the following context:

## Task Plan
{json.dumps(task_plan, indent=2)}

## Backend Context
{backend_context or "No backend files available"}

## API Routes
{api_routes or "No API routes specified"}

## Data Models
{data_models or "No data models specified"}

Create TypeScript/React components that properly integrate with the backend APIs.
Ensure your types match the backend response types exactly.
"""

