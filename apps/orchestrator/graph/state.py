"""
TypedDict for shared project state used by agents.
"""

from typing import TypedDict, Any, List, Dict, Optional, Annotated

def _keep_first(current: Any, incoming: Any) -> Any:
    # Treat None and empty string as "not set" so initial values aren't
    # clobbered by LangGraph's default empty-string initialization.
    if current is None or (isinstance(current, str) and current == ""):
        return incoming
    return current

def _keep_last(current: Any, incoming: Any) -> Any:
    return incoming if incoming is not None else current

def _merge_dicts(current: Optional[Dict[str, Any]], incoming: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    merged: Dict[str, Any] = {}
    if current:
        merged.update(current)
    if incoming:
        merged.update(incoming)
    return merged

def _append_list(current: Optional[List[Any]], incoming: Optional[List[Any]]) -> List[Any]:
    out: List[Any] = list(current or [])
    if incoming:
        out.extend(incoming)
    return out

def _merge_dicts_overwrite(current: Optional[Dict[str, Any]], incoming: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Last-writer-wins per key (for context request/response maps)."""
    merged: Dict[str, Any] = dict(current or {})
    if incoming:
        merged.update(incoming)
    return merged

class FileMetadata(TypedDict, total=False):
    content: str
    createdBy: str
    language: str

class ProjectState(TypedDict, total=False):
    # Project identification
    project_id: Annotated[str, _keep_first]
    user_id: Annotated[str, _keep_first]
    user_prompt: Annotated[str, _keep_first]
    tech_stack: Annotated[Dict[str, Any], _keep_first]

    # Status tracking
    status: Annotated[str, _keep_last]
    error: Annotated[str, _keep_last]

    # Task planning
    task_plan: Annotated[List[Dict[str, Any]], _keep_first]

    # Agent completion flags — every parallel branch can write in the same step.
    # Use _keep_last so the latest value wins (no LastValue/InvalidUpdateError).
    supervisor_completed: Annotated[bool, _keep_last]
    backend_completed: Annotated[bool, _keep_last]
    database_completed: Annotated[bool, _keep_last]
    devops_completed: Annotated[bool, _keep_last]
    frontend_done: Annotated[bool, _keep_last]
    qa_completed: Annotated[bool, _keep_last]
    review_completed: Annotated[bool, _keep_last]
    security_completed: Annotated[bool, _keep_last]
    documentation_completed: Annotated[bool, _keep_last]

    # Agent outputs (generated code/content) — last-writer-wins.
    supervisor_output: Annotated[str, _keep_last]
    backend_output: Annotated[str, _keep_last]
    database_output: Annotated[str, _keep_last]
    devops_output: Annotated[str, _keep_last]
    frontend_output: Annotated[str, _keep_last]
    qa_output: Annotated[str, _keep_last]
    review_output: Annotated[str, _keep_last]
    security_output: Annotated[str, _keep_last]
    documentation_output: Annotated[str, _keep_last]

    # Generated files (path -> FileMetadata mapping) — merge across parallel agents.
    files: Annotated[Dict[str, FileMetadata], _merge_dicts]

    # Review feedback
    review_feedback: Annotated[List[Dict[str, Any]], _append_list]
    security_results: Annotated[Dict[str, Any], _merge_dicts_overwrite]

    # Inter-agent communication
    # Agents can store context requests for other agents
    agent_context_requests: Annotated[Dict[str, str], _merge_dicts_overwrite]  # agent_name -> requested context
    agent_context_responses: Annotated[Dict[str, str], _merge_dicts_overwrite]  # agent_name -> provided context

    # Conversation log for agent-to-agent messages
    conversation_log: Annotated[List[Dict[str, Any]], _append_list]
