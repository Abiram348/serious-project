"""
Documentation agent – generates README, API docs, and architecture diagrams.
"""

from typing import Dict, Any
from .base import BaseAgent

SYSTEM_PROMPT = """You are the Documentation Agent for SwarmDev.

Your role is to:
1. Write README.md (setup, usage, architecture)
2. Generate API documentation (OpenAPI/Swagger spec)
3. Write inline code comments
4. Generate JSDoc / TypeDoc
5. Write CONTRIBUTING.md
6. Produce architecture diagrams (Mermaid)

Output generated files as:
FILE: path/to/file.md
[file content]

NEVER wrap file content in markdown code blocks.
"""

class DocumentationAgent(BaseAgent):
    def __init__(self):
        super().__init__("DOCUMENTATION", SYSTEM_PROMPT, tier="template")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        task_plan = state.get("task_plan", [])
        user_prompt = state.get("user_prompt", "")
        files = state.get("files", {})
        project_id = state.get("project_id", "unknown")

        try:
            await self.log(state, "INFO", "Starting documentation generation")

            # Build context from generated files
            code_context = self._build_code_context(files)

            response = await self.call_llm(
                f"""Generate comprehensive documentation for this project.

User Requirements:
{user_prompt}

Task Plan:
{self._format_task_plan(task_plan)}

Generated Code:
{code_context}

Create:
1. README.md with setup, usage, and architecture
2. API documentation
3. Architecture diagrams (Mermaid format)
4. CONTRIBUTING.md
""",
                max_tokens=8192
            )

            # Parse generated files
            doc_files = self._parse_files(response)
            await self.write_files_to_state(state, doc_files, self.name)

            state.update({
                "documentation_completed": True,
                "documentation_output": response,
            })

            await self.log(state, "INFO", f"Documentation generated ({len(doc_files)} files)")

            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Documentation generated ({len(doc_files)} files)",
                "projectId": project_id
            })

        except Exception as e:
            state["error"] = str(e)
            await self.log(state, "ERROR", f"Documentation generation failed: {str(e)}")
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"Documentation failed: {str(e)}",
                "projectId": project_id
            })

        return state

    def _build_code_context(self, files: Dict[str, Any]) -> str:
        """Build context string from project files."""
        context = []
        for path, file_data in files.items():
            content = file_data.get("content", file_data) if isinstance(file_data, dict) else file_data
            # Include key files for documentation context
            if any(doc_ext in path for doc_ext in ['.ts', '.tsx', '.py', 'schema.prisma', 'route', 'controller']):
                context.append(f"## {path}\n{content[:1500]}")
        return "\n\n".join(context)

    def _format_task_plan(self, task_plan: list) -> str:
        """Format task plan as readable string."""
        if not task_plan:
            return "No specific tasks defined"
        return "\n".join([f"- {t.get('title', 'Unknown')}: {t.get('description', '')}" for t in task_plan])
