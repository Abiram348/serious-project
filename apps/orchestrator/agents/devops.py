"""
DevOps agent – generates Docker, CI/CD, and deployment configurations.
"""

from typing import Dict, Any
from .base import BaseAgent

SYSTEM_PROMPT = """You are the DevOps Agent for SwarmDev.

Your role is to:
1. Write Dockerfile for each service
2. Write docker-compose.yml for local dev
3. Write GitHub Actions CI/CD pipelines
4. Configure environment variable templates
5. Write Kubernetes manifests (if needed)
6. Setup health checks and readiness probes

Output generated files as JSON with path and content.
"""

class DevOpsAgent(BaseAgent):
    def __init__(self):
        super().__init__("DEVOPS", SYSTEM_PROMPT, tier="template")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        task_plan = state.get("task_plan", [])
        user_prompt = state.get("user_prompt", "")
        project_id = state.get("project_id", "unknown")

        try:
            await self.log(state, "INFO", "Starting DevOps configuration generation")

            response = await self.call_llm(
                f"Generate DevOps configurations for this project:\n\nUser Requirements:\n{user_prompt}\n\nTask Plan:\n{self._format_task_plan(task_plan)}",
                max_tokens=8192
            )

            files = self._parse_files(response)
            await self.write_files_to_state(state, files, self.name)

            state.update({
                "devops_completed": True,
                "devops_output": response,
            })

            await self.log(state, "INFO", f"DevOps configs generated ({len(files)} files)")

            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"DevOps configs generated ({len(files)} files)",
                "projectId": project_id
            })

        except Exception as e:
            state["error"] = str(e)
            await self.log(state, "ERROR", f"DevOps generation failed: {str(e)}")
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"DevOps failed: {str(e)}",
                "projectId": project_id
            })

        return state

    def _format_task_plan(self, task_plan: list) -> str:
        """Format task plan as readable string."""
        if not task_plan:
            return "No specific tasks defined"
        return "\n".join([f"- {t.get('title', 'Unknown')}: {t.get('description', '')}" for t in task_plan])
