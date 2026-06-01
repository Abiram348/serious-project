"""
QA agent – writes and runs unit, integration, and e2e tests.
"""

from typing import Dict, Any
from .base import BaseAgent

SYSTEM_PROMPT = """You are the QA Agent for SwarmDev.

Your role is to:
1. Write Jest/Vitest unit tests for all services
2. Write Supertest API integration tests
3. Write Playwright end-to-end tests
4. Report coverage metrics
5. Flag failing tests

Output generated test files as JSON with path and content.
"""

class QAAgent(BaseAgent):
    def __init__(self):
        super().__init__("QA", SYSTEM_PROMPT, tier="code_gen")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        task_plan = state.get("task_plan", [])
        files = state.get("files", {})
        project_id = state.get("project_id", "unknown")

        try:
            await self.log(state, "INFO", "Starting test generation")

            # Build context from generated files
            files_context = self._build_files_context(files)

            response = await self.call_llm(
                f"Generate comprehensive tests for this project:\n\n{files_context}\n\nTask Plan:\n{self._format_task_plan(task_plan)}",
                max_tokens=8192
            )

            files = self._parse_files(response)
            await self.write_files_to_state(state, files, self.name)

            state.update({
                "qa_completed": True,
                "qa_output": response,
            })

            await self.log(state, "INFO", f"Tests generated ({len(files)} files)")

            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Tests generated ({len(files)} files)",
                "projectId": project_id
            })

        except Exception as e:
            state["error"] = str(e)
            await self.log(state, "ERROR", f"Test generation failed: {str(e)}")
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"QA failed: {str(e)}",
                "projectId": project_id
            })

        return state

    def _build_files_context(self, files: Dict[str, Any]) -> str:
        """Build context string from project files."""
        if not files:
            return "No files available"

        context = []
        for path, file_data in files.items():
            content = file_data.get("content", file_data) if isinstance(file_data, dict) else file_data
            context.append(f"## {path}\n{content[:2000]}")  # Truncate large files
        return "\n\n".join(context)

    def _format_task_plan(self, task_plan: list) -> str:
        """Format task plan as readable string."""
        if not task_plan:
            return "No specific tasks defined"
        return "\n".join([f"- {t.get('title', 'Unknown')}: {t.get('description', '')}" for t in task_plan])
