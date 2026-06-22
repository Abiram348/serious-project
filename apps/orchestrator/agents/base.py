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
from tools.search_tools import SearchTools
import httpx

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
        self._search_tools: Optional[SearchTools] = None

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
        message = response.choices[0].message
        content = message.content or ""
        # Ollama reasoning models (deepseek-v4-pro, qwen3.5) return output in
        # message.reasoning when content is empty. Fall back to reasoning field.
        reasoning = getattr(message, "reasoning", None) or ""
        return content if content.strip() else reasoning

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

        Supports multiple output formats that LLMs commonly use:
        1. Explicit FILE markers:
           FILE: path/to/file.tsx
           [file content here]

        2. Markdown code blocks with filepath comment:
           ```tsx
           // filepath: path/to/file.tsx
           [content]
           ```

        3. Markdown code blocks with filename in fence info:
           ```tsx path/to/file.tsx
           [content]
           ```

        Args:
            content: LLM response containing file markers

        Returns:
            Dictionary mapping file paths to content
        """
        files = {}
        lines = content.split('\n')
        current_file: Optional[str] = None
        current_content: List[str] = []
        in_fence = False
        fence_file_hint: Optional[str] = None

        for i, line in enumerate(lines):
            stripped = line.strip()

            # Handle markdown fences
            if stripped.startswith('```'):
                if not in_fence:
                    # Opening fence — check for filename hint: ```tsx path/to/file.tsx
                    fence_parts = stripped.split()
                    if len(fence_parts) >= 2:
                        hint = fence_parts[-1]
                        # If last part looks like a path (contains / or .), use it
                        if '/' in hint or ('.' in hint and hint not in ('tsx', 'ts', 'jsx', 'js', 'py', 'css', 'html', 'json', 'md', 'yaml', 'yml', 'sql', 'prisma', 'sh', 'bash')):
                            fence_file_hint = hint
                    in_fence = True
                else:
                    # Closing fence — save file if we have one
                    in_fence = False
                    if current_file and current_content:
                        files[current_file] = '\n'.join(current_content).strip()
                        current_file = None
                        current_content = []
                    fence_file_hint = None
                continue

            # FILE: marker (works inside or outside fences)
            if stripped.startswith('FILE: '):
                # Save previous file if exists
                if current_file and current_content:
                    files[current_file] = '\n'.join(current_content).strip()
                current_file = stripped.replace('FILE: ', '').strip()
                current_content = []
                continue

            # filepath comment inside code
            if stripped.startswith('// filepath:') or stripped.startswith('# filepath:') or stripped.startswith('<!-- filepath:') or stripped.startswith('-- filepath:'):
                # Save previous file if exists
                if current_file and current_content:
                    files[current_file] = '\n'.join(current_content).strip()
                # Extract path after the colon
                path_part = stripped.split(':', 1)[1].strip().rstrip(' -->').rstrip('-->')
                current_file = path_part
                current_content = []
                continue

            # If we have a fence hint and are inside a fence but no explicit file yet
            if in_fence and fence_file_hint and not current_file:
                current_file = fence_file_hint
                fence_file_hint = None

            # Accumulate content if we know which file it belongs to
            if current_file is not None:
                current_content.append(line)

        # Save last file
        if current_file and current_content:
            files[current_file] = '\n'.join(current_content).strip()

        # Fallback: try to parse JSON if no files were found via FILE markers
        if not files:
            try:
                parsed = self._parse_json_from_response(content)
                if isinstance(parsed, dict):
                    for path, file_data in parsed.items():
                        if isinstance(file_data, dict):
                            files[path] = file_data.get("content", "")
                        elif isinstance(file_data, str):
                            files[path] = file_data
            except Exception:
                pass

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

    async def _persist_file_to_api(self, project_id: str, path: str, content: str, language: str, created_by: str):
        """Persist a single file to the API database immediately.

        This ensures files are clickable in the IDE as soon as they appear.
        """
        api_url = os.getenv("API_URL", "http://localhost:3001")
        api_secret = os.getenv("API_SECRET", "dev-secret")
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{api_url}/api/internal/projects/{project_id}/files/{path.lstrip('/')}",
                    json={"content": content, "language": language, "createdBy": created_by},
                    headers={
                        "X-API-SECRET": api_secret,
                        "Content-Type": "application/json",
                    },
                    timeout=30.0,
                )
        except Exception as e:
            # Non-blocking: log but don't fail the pipeline if API is temporarily unreachable
            print(f"[BaseAgent] Failed to persist file {path} to API: {e}")

    async def write_files_to_state(self, state: Dict[str, Any], files: Dict[str, str], created_by: Optional[str] = None):
        """Write generated files to the project state with metadata.

        Also emits file_created socket events and persists to API so the IDE
        shows files in real-time and they are immediately clickable.

        Args:
            state: Current project state
            files: Dictionary mapping file paths to content
            created_by: Optional agent name (defaults to self.name)
        """
        if "files" not in state:
            state["files"] = {}

        agent_name = created_by or self.name
        project_id = state.get("project_id", "unknown")
        for path, content in files.items():
            language = self._get_language_from_path(path)
            state["files"][path] = {
                "content": content,
                "createdBy": agent_name,
                "language": language
            }
            # Emit real-time file creation event to IDE
            await self.emit_event("file_created", {
                "path": path,
                "content": content,
                "language": language,
                "agentType": agent_name,
                "projectId": project_id,
            })
            # Persist to API so files are immediately clickable
            await self._persist_file_to_api(project_id, path, content, language, agent_name)

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

    def _get_search_tools(self) -> SearchTools:
        """Get or initialize search tools (Qdrant client).

        Returns:
            SearchTools instance
        """
        if not self._search_tools:
            self._search_tools = SearchTools()
        return self._search_tools

    async def index_project_files(self, state: Dict[str, Any]) -> bool:
        """Index all project files into Qdrant vector database.

        Args:
            state: Current project state

        Returns:
            True if indexing succeeded
        """
        import os
        if not os.getenv("QDRANT_URL"):
            return False

        try:
            files = self.get_files(state)
            if not files:
                return False

            search = self._get_search_tools()
            project_id = state.get("project_id", "unknown")
            collection_name = f"project_{project_id}"

            # Create simple hash-based embeddings (placeholder until real embeddings)
            # In production, use sentence-transformers or OpenAI embeddings
            embeddings = []
            for path, content in files.items():
                # Simple character-frequency based embedding for demo
                embedding = [float(ord(c)) / 255.0 for c in content[:768]]
                if len(embedding) < 768:
                    embedding.extend([0.0] * (768 - len(embedding)))
                embeddings.append(embedding)

            await search.index_code(collection_name, files, embeddings)
            await self.log(state, "INFO", f"Indexed {len(files)} files into Qdrant")
            return True
        except Exception as e:
            await self.log(state, "WARNING", f"Qdrant indexing failed: {str(e)}")
            return False

    async def search_project_code(self, state: Dict[str, Any], query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search for similar code in the project's Qdrant collection.

        Args:
            state: Current project state
            query: Search query
            limit: Maximum results

        Returns:
            List of search results
        """
        import os
        if not os.getenv("QDRANT_URL"):
            return []

        try:
            search = self._get_search_tools()
            project_id = state.get("project_id", "unknown")
            collection_name = f"project_{project_id}"

            # Simple query embedding (placeholder)
            query_embedding = [float(ord(c)) / 255.0 for c in query[:768]]
            if len(query_embedding) < 768:
                query_embedding.extend([0.0] * (768 - len(query_embedding)))

            results = await search.search_code(collection_name, query_embedding, limit=limit)
            await self.log(state, "INFO", f"Qdrant search found {len(results)} results for '{query}'")
            return results
        except Exception as e:
            await self.log(state, "WARNING", f"Qdrant search failed: {str(e)}")
            return []

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
