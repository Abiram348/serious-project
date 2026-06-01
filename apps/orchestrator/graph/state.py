"""
TypedDict for shared project state used by agents.
"""

from typing import TypedDict, Any, List, Dict, Optional, Annotated, Callable

def _keep_first(current: Any, incoming: Any) -> Any:
    return current if current is not None else incoming

def _keep_last(current: Any, incoming: Any) -> Any:
    return incoming if incoming is not None else current

def _merge_dicts(current: Optional[Dict[str, Any]], incoming: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    merged: Dict[str, Any] = {}
    if current:
        merged.update(current)
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

    # Agent completion flags
    supervisor_completed: bool
    backend_completed: bool
    database_completed: bool
    devops_completed: bool
    frontend_done: bool
    qa_completed: bool
    review_completed: bool
    security_completed: bool
    documentation_completed: bool

    # Agent outputs (generated code/content)
    supervisor_output: str
    backend_output: str
    database_output: str
    devops_output: str
    frontend_output: str
    qa_output: str
    review_output: str
    security_output: str
    documentation_output: str

    # Generated files (path -> FileMetadata mapping)
    files: Annotated[Dict[str, FileMetadata], _merge_dicts]

    # Review feedback
    review_feedback: List[Dict[str, Any]]
    security_results: Dict[str, Any]

    # Inter-agent communication
    # Agents can store context requests for other agents
    agent_context_requests: Dict[str, str]  # agent_name -> requested context
    agent_context_responses: Dict[str, str]  # agent_name -> provided context

    # Conversation log for agent-to-agent messages
    conversation_log: List[Dict[str, Any]]
