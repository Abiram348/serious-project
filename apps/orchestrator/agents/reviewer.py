"""
Code Review Agent – reviews all code produced by other agents.
"""

import os
import json
import re
from typing import Dict, Any, List
from .base import BaseAgent

SYSTEM_PROMPT = """You are the Code Review Agent for SwarmDev.

Your role is to:
1. Review every file produced by other agents
2. Flag security vulnerabilities
3. Identify logic bugs and edge cases
4. Check for code style consistency
5. Verify API contracts match between frontend and backend
6. Produce a structured review report

Output format:
- List issues found with severity (CRITICAL, HIGH, MEDIUM, LOW)
- Suggest specific fixes for each issue
- Approve files that pass review
"""

class ReviewerAgent(BaseAgent):
    def __init__(self):
        super().__init__("REVIEWER", SYSTEM_PROMPT, tier="reasoning")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        files = state.get("files", {})
        project_id = state.get("project_id", "unknown")

        if not files:
            state["review_completed"] = True
            state["review_feedback"] = []
            return state

        try:
            await self.log(state, "INFO", "Starting code review")

            # Build review prompt with all files
            files_content = self._build_files_context(files)

            review_prompt = f"""
Review the following generated files for:
1. Security vulnerabilities
2. Logic bugs and edge cases
3. Code style issues
4. API contract mismatches
5. Best practices violations

{files_content}

Output your review as JSON:
{{
  "issues": [
    {{"file": "path", "severity": "CRITICAL|HIGH|MEDIUM|LOW", "description": "...", "suggestion": "..."}}
  ],
  "approved_files": ["list of files that pass review"]
}}
"""

            response = await self.call_llm(review_prompt, max_tokens=8192)

            # Parse review results
            review_data = self._parse_review_response(response)

            state["review_feedback"] = review_data.get("issues", [])
            state["review_output"] = response
            state["review_completed"] = True

            issues_count = len(review_data.get("issues", []))
            await self.log(state, "INFO", f"Review complete: {issues_count} issues found")

            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "completed",
                "message": f"Review complete: {issues_count} issues found",
                "projectId": project_id
            })

        except Exception as e:
            state["status"] = "FAILED"
            state["error"] = str(e)
            await self.log(state, "ERROR", f"Code review failed: {str(e)}")
            await self.emit_event("agent_status", {
                "agent": self.name,
                "status": "failed",
                "message": f"Code review failed: {str(e)}",
                "projectId": project_id
            })

        return state

    def _build_files_context(self, files: Dict[str, Any]) -> str:
        """Build context string from project files."""
        context_parts = []
        for path, file_data in files.items():
            content = file_data.get("content", file_data) if isinstance(file_data, dict) else file_data
            context_parts.append(f"## {path}\n{content}")
        return "\n\n".join(context_parts)

    def _parse_review_response(self, response: str) -> Dict[str, Any]:
        """Parse JSON from review response."""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception:
            pass
        return {"issues": [], "approved_files": []}
