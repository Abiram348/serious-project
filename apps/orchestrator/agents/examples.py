"""
Example agents demonstrating inter-agent communication patterns.
These show how agents can query each other for context via LangGraph shared state.
"""

import os
import json
from typing import Dict, Any
from .base import BaseAgent


class FrontendWithContextAgent(BaseAgent):
    """Frontend agent that queries backend for API context.

    This demonstrates how agents can use shared state to communicate:
    1. Frontend agent reads backend_output from state
    2. Parses API routes and types
    3. Generates frontend code that matches the backend contracts
    """

    def __init__(self):
        super().__init__("FRONTEND")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        # Get backend context via inter-agent communication
        backend_output = self.get_agent_output(state, "BACKEND")
        backend_files = self.get_files_by_agent(state, "BACKEND")
        task_plan = self.get_task_plan(state)

        # Build context from backend
        backend_context = self._build_backend_context(backend_files)

        # Query specific information from backend
        api_routes = self.query_agent(state, "BACKEND", "API routes endpoints")
        data_models = self.query_agent(state, "DATABASE", "database models schema")

        # Generate frontend code with backend context
        prompt = self._build_prompt(task_plan, backend_context, api_routes, data_models)

        response = await self.call_llm(
            prompt,
            system_prompt="You are a Frontend Developer agent.",
            max_tokens=4096,
        )

        # Parse generated files
        files = self._parse_files(response)
        state["files"].update(files)
        state["frontend_output"] = response
        state["frontend_done"] = True

        return state

    def _build_backend_context(self, backend_files: Dict[str, str]) -> str:
        """Build context string from backend files."""
        context_parts = []
        for path, content in backend_files.items():
            context_parts.append(f"## {path}\n{content}")
        return "\n\n".join(context_parts)

    def _build_prompt(
        self,
        task_plan: list,
        backend_context: str,
        api_routes: str,
        data_models: str,
    ) -> str:
        """Build prompt with all context."""
        return f"""
Create a frontend based on the following:

## Task Plan
{json.dumps(task_plan, indent=2)}

## Backend Context
{backend_context}

## API Routes
{api_routes}

## Data Models
{data_models}

Generate TypeScript/React components that properly integrate with the backend APIs.
Ensure type safety by matching backend response types.
"""

    def _parse_files(self, response: str) -> Dict[str, str]:
        """Parse files from LLM response."""
        files = {}
        lines = response.split("\n")
        current_file = None
        current_content = []

        for line in lines:
            if line.startswith("FILE: "):
                if current_file:
                    files[current_file] = "\n".join(current_content)
                current_file = line.replace("FILE: ", "").strip()
                current_content = []
            elif current_file:
                current_content.append(line)

        if current_file:
            files[current_file] = "\n".join(current_content)

        return files


class QAAgentWithContext(BaseAgent):
    """QA agent that reviews all previous agent outputs.

    Demonstrates reading from multiple agents:
    1. Gets frontend, backend, database outputs
    2. Reviews for integration issues
    3. Generates test cases based on actual code
    """

    def __init__(self):
        super().__init__("QA")

    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        # Gather context from all agents
        all_files = self.get_files(state)
        frontend_files = self.get_files_by_agent(state, "FRONTEND")
        backend_files = self.get_files_by_agent(state, "BACKEND")
        review_feedback = self.get_review_feedback(state)

        # Build comprehensive test context
        test_context = {
            "total_files": len(all_files),
            "frontend_files": list(frontend_files.keys()),
            "backend_files": list(backend_files.keys()),
            "review_issues": review_feedback,
        }

        prompt = f"""
Generate comprehensive tests for the following project:

## Test Context
{json.dumps(test_context, indent=2)}

## Frontend Files
{self._format_files(frontend_files)}

## Backend Files
{self._format_files(backend_files)}

Generate test files that cover:
1. Unit tests for each module
2. Integration tests between frontend and backend
3. E2E test scenarios
"""

        response = await self.call_llm(
            prompt,
            system_prompt="You are a QA Engineer agent.",
            max_tokens=4096,
        )

        files = self._parse_files(response)
        state["files"].update(files)
        state["qa_output"] = response
        state["qa_completed"] = True

        return state

    def _format_files(self, files: Dict[str, str]) -> str:
        """Format files as string."""
        return "\n\n".join([f"## {path}\n{content}" for path, content in files.items()])

    def _parse_files(self, response: str) -> Dict[str, str]:
        """Parse files from LLM response."""
        files = {}
        lines = response.split("\n")
        current_file = None
        current_content = []

        for line in lines:
            if line.startswith("FILE: "):
                if current_file:
                    files[current_file] = "\n".join(current_content)
                current_file = line.replace("FILE: ", "").strip()
                current_content = []
            elif current_file:
                current_content.append(line)

        if current_file:
            files[current_file] = "\n".join(current_content)

        return files
