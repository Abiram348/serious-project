"""
Chat Router for SwarmDev — parses @mentions and routes messages to specific agents.
Also handles model preference loading and conversation context building.
"""

import os
import re
import json
from typing import Dict, Any, Tuple, Optional, List
from .base import BaseAgent

# Agent name mapping (lowercase -> canonical name)
AGENT_MAP = {
    "supervisor": "SUPERVISOR",
    "frontend": "FRONTEND",
    "backend": "BACKEND",
    "database": "DATABASE",
    "db": "DATABASE",
    "devops": "DEVOPS",
    "qa": "QA",
    "reviewer": "REVIEWER",
    "security": "SECURITY",
    "doc": "DOCUMENTATION",
    "documentation": "DOCUMENTATION",
}

# Recommended default model assignments per agent
RECOMMENDED_MODELS = {
    "SUPERVISOR": "llama4",
    "REVIEWER": "llama4",
    "SECURITY": "llama4",
    "FRONTEND": "kimi",
    "BACKEND": "codellama",
    "DATABASE": "codellama",
    "QA": "codellama",
    "DEVOPS": "mistral-small",
    "DOCUMENTATION": "mistral-small",
}

MENTION_RE = re.compile(r"@([a-zA-Z_-]+)")

API_URL = os.getenv("API_URL", "http://localhost:3001")
API_SECRET = os.getenv("API_SECRET", "dev-secret")


class ChatRouter:
    """Routes user chat messages to the appropriate agent based on @mentions."""

    @staticmethod
    def parse_mention(content: str) -> Tuple[Optional[str], str]:
        """Extract @agent mention and return (canonical_agent_name, clean_content)."""
        match = MENTION_RE.search(content)
        if not match:
            return None, content

        raw_name = match.group(1).lower()
        canonical = AGENT_MAP.get(raw_name)
        if not canonical:
            return None, content

        # Remove the mention from content
        clean = MENTION_RE.sub("", content, count=1).strip()
        return canonical, clean

    @staticmethod
    async def load_model_preferences(project_id: str) -> Dict[str, str]:
        """Load per-agent model preferences from the API database."""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{API_URL}/api/projects/{project_id}/models",
                    headers={
                        "X-API-SECRET": API_SECRET,
                    },
                    timeout=10.0,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    prefs = data.get("preferences", {})
                    if prefs:
                        return prefs
        except Exception as e:
            print(f"[chat_router] Failed to load model preferences: {e}")

        return dict(RECOMMENDED_MODELS)

    @staticmethod
    async def load_chat_history(project_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Load recent chat messages from the API database."""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{API_URL}/api/projects/{project_id}/chat",
                    headers={
                        "X-API-SECRET": API_SECRET,
                    },
                    timeout=10.0,
                )
                if resp.status_code == 200:
                    messages = resp.json()
                    # Return last N messages
                    return messages[-limit:] if len(messages) > limit else messages
        except Exception as e:
            print(f"[chat_router] Failed to load chat history: {e}")

        return []

    @staticmethod
    def build_system_prompt_for_agent(agent_name: str, project_context: str = "") -> str:
        """Build a system prompt tailored for chat-mode agent responses."""
        base = f"""You are the {agent_name} Agent for SwarmDev, responding to a user's chat message.

You are in "chat mode" — not "code generation mode". Your job is to:
1. Answer the user's question clearly and concisely
2. If they ask for a code change, describe what you would do and ask for confirmation
3. If they ask for advice, give thoughtful recommendations
4. Keep responses helpful but brief (2-4 paragraphs max)
5. Use markdown formatting for readability

Available agents: SUPERVISOR, FRONTEND, BACKEND, DATABASE, DEVOPS, QA, REVIEWER, SECURITY, DOCUMENTATION.
Users can @mention any agent to direct their question.
"""
        if project_context:
            base += f"\n\n## Project Context\n{project_context}"
        return base

    @staticmethod
    def format_history_for_llm(history: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Convert chat history records to OpenAI message format."""
        messages = []
        for msg in history:
            role = msg.get("role", "USER")
            content = msg.get("content", "")
            agent = msg.get("agentType") or msg.get("targetAgent")

            if role == "USER":
                messages.append({"role": "user", "content": content})
            elif role in ("AGENT", "SUPERVISOR", "SYSTEM"):
                # Prefix with agent name for context
                prefix = f"[{agent}] " if agent else ""
                messages.append({"role": "assistant", "content": f"{prefix}{content}"})
        return messages
