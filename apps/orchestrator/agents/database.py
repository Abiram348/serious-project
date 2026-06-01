"""
Database agent – designs schemas, writes migrations, and generates queries.
"""

from typing import Dict, Any
from .base import BaseAgent

SYSTEM_PROMPT = """You are the Database Agent for SwarmDev.

Your role is to:
1. Design normalized database schemas from requirements
2. Write Prisma schema (or Drizzle ORM)
3. Generate and run migrations
4. Write efficient queries and stored procedures
5. Design indexes for performance
6. Write seed data scripts

Output generated files as JSON with path and content.
"""

class DatabaseAgent(BaseAgent):
    def __init__(self):
        super().__init__("DATABASE", SYSTEM_PROMPT, tier="code_gen")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        task_plan = state.get("task_plan", [])
        user_prompt = state.get("user_prompt", "")
        project_id = state.get("project_id", "unknown")

        try:
            await self.log(state, "INFO", "Starting database schema design")

            # Call Claude with task plan and user requirements
            response = await self.call_llm(
                f"Generate database schema for this project:\n\nUser Requirements:\n{user_prompt}\n\nTask Plan:\n{self._format_task_plan(task_plan)}",
                max_tokens=8192
            )

            # Parse generated files
            files = self._parse_files(response)

            # Write files to state
            await self.write_files_to_state(state, files, self.name)

            # Update state
            state.update({
                "database_completed": True,
                "database_output": response,
            })

            await self.log(state, "INFO", f"Database schema generated ({len(files)} files)")

            # Emit socket event
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Database schema generated ({len(files)} files)",
                "projectId": project_id
            })

        except Exception as e:
            state["error"] = str(e)
            await self.log(state, "ERROR", f"Database design failed: {str(e)}")
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"Database failed: {str(e)}",
                "projectId": project_id
            })

        return state

    def _format_task_plan(self, task_plan: list) -> str:
        """Format task plan as readable string."""
        if not task_plan:
            return "No specific tasks defined"
        return "\n".join([f"- {t.get('title', 'Unknown')}: {t.get('description', '')}" for t in task_plan])
