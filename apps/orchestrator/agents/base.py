"""
Base class for all agents in the SwarmDev orchestration engine.
Agents receive a ProjectState, may modify it, and return the updated state.
"""

import os
import re
import json
from datetime import datetime
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from openai import AsyncOpenAI

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "ollama")

TIER_MODELS = {
    "reasoning": os.getenv("OLLAMA_REASONING_MODEL", "llama4"),
    "code_gen": os.getenv("OLLAMA_CODEGEN_MODEL", "codellama"),
    "template": os.getenv("OLLAMA_TEMPLATE_MODEL", "mistral-small"),
}

class BaseAgent(ABC):
    def __init__(self, name: str, system_prompt: str = "", tier: str = "code_gen"):
        self.name = name
        self.system_prompt = system_prompt
        self.tier = tier
        self.model = TIER_MODELS.get(tier, TIER_MODELS["code_gen"])
        self.client = AsyncOpenAI(
            base_url=f"{OLLAMA_BASE_URL}/v1",
            api_key=OLLAMA_API_KEY,
        )

    @abstractmethod
    async def run(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the agent logic and return the possibly modified state."""
        raise NotImplementedError

    async def call_llm(
        self,
        user_prompt: str,
        system_prompt: str = "",
        max_tokens: int = 4096,
        model: Optional[str] = None,
    ) -> str:
        """Call Ollama LLM with the given prompts.

        Args:
            user_prompt: The user's request/prompt
            system_prompt: Optional system prompt (overrides instance default)
            max_tokens: Maximum tokens in response
            model: Optional model override (defaults to instance model)

        Returns:
            LLM response text
        """
        sys_prompt = system_prompt or self.system_prompt
        messages = []
        if sys_prompt:
            messages.append({"role": "system", "content": sys_prompt})
        messages.append({"role": "user", "content": user_prompt})

        response = await self.client.chat.completions.create(
            model=model or self.model,
            max_tokens=max_tokens,
            messages=messages,
        )
        return response.choices[0].message.content

    async def emit_event(self, event_type: str, payload: Dict[str, Any]):
        """Emit a socket event via the socket emitter utility.

        Args:
            event_type: Type of event (agent_status, agent_log, file_created, etc.)
            payload: Event payload data
        """
        from utils.socket_emitter import emit
        await emit(event_type, payload)

    async def log(self, state: Dict[str, Any], level: str, message: str):
        """Log a message and emit socket event.

        Args:
            state: Current project state
            level: Log level (DEBUG, INFO, WARNING, ERROR)
            message: Log message
        """
        project_id = state.get("project_id", "unknown")
        await self.emit_event("agent_log", {
            "agent": self.name,
            "level": level,
            "message": message,
            "projectId": project_id
        })

    def _parse_files(self, content: str) -> Dict[str, str]:
        """Parse generated files from LLM response.

        Expected format in content:
        FILE: path/to/file.tsx
        [file content here]

        FILE: path/to/another/file.ts
        [file content here]

        Args:
            content: LLM response containing file markers

        Returns:
            Dictionary mapping file paths to content
        """
        files = {}
        lines = content.split('\n')
        current_file: Optional[str] = None
        current_content: List[str] = []

        for line in lines:
            if line.startswith('FILE: '):
                # Save previous file if exists
                if current_file:
                    files[current_file] = '\n'.join(current_content).strip()
                current_file = line.replace('FILE: ', '').strip()
                current_content = []
            elif current_file is not None:
                current_content.append(line)

        # Save last file
        if current_file:
            files[current_file] = '\n'.join(current_content).strip()

        return files

    def _parse_json_from_response(self, text: str) -> Optional[Any]:
        """Extract JSON from LLM response using balanced-brace matching.

        Handles nested objects/arrays correctly, unlike regex approaches.

        Args:
            text: LLM response text

        Returns:
            Parsed JSON object or None if not found
        """
        # Find the first { or [
        start = -1
        for i, ch in enumerate(text):
            if ch in ('{', '['):
                start = i
                break
        if start == -1:
            return None

        # Walk forward matching braces/brackets until the stack empties
        stack = []
        for i in range(start, len(text)):
            if text[i] in ('{', '['):
                stack.append(text[i])
            elif text[i] in ('}', ']'):
                if not stack:
                    return None
                expected = '{' if text[i] == '}' else '['
                if stack[-1] != expected:
                    return None
                stack.pop()
                if not stack:
                    try:
                        return json.loads(text[start:i + 1])
                    except json.JSONDecodeError:
                        return None
        return None

    async def write_files_to_state(self, state: Dict[str, Any], files: Dict[str, str], created_by: Optional[str] = None):
        """Write generated files to the project state with metadata.

        Args:
            state: Current project state
            files: Dictionary mapping file paths to content
            created_by: Optional agent name (defaults to self.name)
        """
        if "files" not in state:
            state["files"] = {}

        agent_name = created_by or self.name
        for path, content in files.items():
            state["files"][path] = {
                "content": content,
                "createdBy": agent_name,
                "language": self._get_language_from_path(path)
            }

        await self.log(state, "INFO", f"Added {len(files)} files to project state")

    def get_file_content(self, file_data: Any) -> str:
        """Extract content from file data (handles both string and FileMetadata formats).

        Args:
            file_data: Either a string content or FileMetadata dict

        Returns:
            File content as string
        """
        if isinstance(file_data, dict):
            return file_data.get("content", "")
        return str(file_data)

    def _get_language_from_path(self, path: str) -> str:
        """Determine programming language from file path/extension.

        Args:
            path: File path

        Returns:
            Language identifier (typescript, python, etc.)
        """
        ext = path.split('.')[-1].lower() if '.' in path else ''
        lang_map = {
            'ts': 'typescript', 'tsx': 'typescript', 'js': 'javascript', 'jsx': 'javascript',
            'py': 'python', 'rs': 'rust', 'go': 'go', 'java': 'java', 'rb': 'ruby',
            'sql': 'sql', 'md': 'markdown', 'json': 'json', 'yaml': 'yaml', 'yml': 'yaml',
            'html': 'html', 'css': 'css', 'scss': 'scss', 'sh': 'bash', 'prisma': 'prisma',
        }
        return lang_map.get(ext, 'text')

    def get_agent_output(self, state: Dict[str, Any], agent_name: str) -> Optional[str]:
        """Get output from another agent by name.

        Args:
            state: Current project state
            agent_name: Name of the agent whose output to retrieve

        Returns:
            The agent's output string or None if not available
        """
        output_key = f"{agent_name.lower()}_output"
        return state.get(output_key)

    def get_files(self, state: Dict[str, Any]) -> Dict[str, str]:
        """Get all files generated so far.

        Args:
            state: Current project state

        Returns:
            Dictionary mapping file paths to content (strips metadata)
        """
        files = state.get("files", {})
        # Convert from FileMetadata format to simple path->content
        result = {}
        for path, file_data in files.items():
            if isinstance(file_data, dict):
                result[path] = file_data.get("content", "")
            else:
                result[path] = file_data
        return result

    def get_files_by_agent(self, state: Dict[str, Any], agent_name: str) -> Dict[str, str]:
        """Get files generated by a specific agent.

        Args:
            state: Current project state
            agent_name: Name of the agent whose files to retrieve

        Returns:
            Dictionary mapping file paths to content
        """
        all_files = self.get_files(state)
        agent_files = {}

        # Check if agent has a file_prefix attribute
        prefix_map = {
            "BACKEND": ["apps/api/", "apps/web/src/server/", "src/server/"],
            "FRONTEND": ["apps/web/", "src/components/", "src/app/", "src/pages/"],
            "DATABASE": ["prisma/", "schema.prisma", "migrations/"],
            "DEVOPS": ["Dockerfile", "docker-compose", ".github/", "kubernetes/", "terraform/"],
            "DOCUMENTATION": [".md", "docs/", "README"],
        }

        # Get all files created by this agent
        files_metadata = state.get("files", {})
        for path, file_data in files_metadata.items():
            if isinstance(file_data, dict) and file_data.get("createdBy") == agent_name:
                agent_files[path] = file_data.get("content", "")
            elif isinstance(file_data, str):
                # Fallback for string-only format
                if any(path.startswith(prefix) or prefix in path for prefix in prefix_map.get(agent_name, [])):
                    agent_files[path] = file_data

        return agent_files

    def get_task_plan(self, state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get the task plan generated by supervisor.

        Args:
            state: Current project state

        Returns:
            List of task dictionaries
        """
        return state.get("task_plan", [])

    def get_review_feedback(self, state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get feedback from the reviewer agent.

        Args:
            state: Current project state

        Returns:
            List of review issues
        """
        return state.get("review_feedback", [])

    def get_security_results(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Get security scan results.

        Args:
            state: Current project state

        Returns:
            Dictionary with security findings
        """
        return state.get("security_results", {})

    async def send_message_to_agent(self, state: Dict[str, Any], target_agent: str, message: str):
        """Send a message to another agent via the conversation log.

        Args:
            state: Current project state
            target_agent: Name of the target agent
            message: Message content to send
        """
        entry = {
            "from": self.name,
            "to": target_agent,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }

        if "conversation_log" not in state:
            state["conversation_log"] = []

        state["conversation_log"].append(entry)
        await self.log(state, "INFO", f"Message sent to {target_agent}")

    def get_conversation_log(self, state: Dict[str, Any], target_agent: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve conversation log entries.

        Args:
            state: Current project state
            target_agent: Optional filter for messages to/from a specific agent

        Returns:
            List of conversation log entries
        """
        log = state.get("conversation_log", [])
        if target_agent:
            return [entry for entry in log if entry.get("from") == target_agent or entry.get("to") == target_agent]
        return log

    def query_agent(self, state: Dict[str, Any], agent_name: str, query: str) -> str:
        """Query another agent's output for specific information.

        This is a simple string-based query that searches within an agent's output.
        For more complex queries, use get_agent_output and parse the result.

        Args:
            state: Current project state
            agent_name: Name of the agent to query
            query: What information to find

        Returns:
            Relevant information or empty string if not found
        """
        output = self.get_agent_output(state, agent_name)
        if not output:
            return ""

        # Simple keyword matching - in production this could use RAG
        query_terms = query.lower().split()
        output_lines = output.split('\n')

        relevant_lines = []
        for line in output_lines:
            if any(term in line.lower() for term in query_terms):
                relevant_lines.append(line)

        return '\n'.join(relevant_lines) if relevant_lines else ""
