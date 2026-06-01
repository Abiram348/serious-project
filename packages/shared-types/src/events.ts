export interface AgentEvent {
  type:
    | 'agent_status'
    | 'agent_log'
    | 'file_created'
    | 'file_updated'
    | 'project_status'
    | 'terminal_output'
    | 'agent_message'
    | 'build_result'
    | 'preview_ready';
  projectId: string;
  agentType?: keyof typeof import('./project').AgentType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface WebSocketToServerEvents {
  join_project: (data: { projectId: string }) => void;
  leave_project: (data: { projectId: string }) => void;
  send_message: (data: { projectId: string; content: string }) => void;
  request_file: (data: { projectId: string; path: string }) => void;
  exec_command: (data: { projectId: string; command: string }) => void;
}

export interface ServerToWebSocketEvents {
  agent_status: (data: {
    agentType: keyof typeof import('./project').AgentType;
    status: keyof typeof import('./project').AgentStatus;
    message: string;
  }) => void;
  agent_log: (data: {
    agentType: keyof typeof import('./project').AgentType;
    level: string;
    message: string;
    timestamp: string;
  }) => void;
  agent_message: (data: {
    agentType: keyof typeof import('./project').AgentType;
    content: string;
  }) => void;
  file_created: (data: {
    path: string;
    content: string;
    createdBy: keyof typeof import('./project').AgentType;
  }) => void;
  file_updated: (data: {
    path: string;
    content: string;
    updatedBy: keyof typeof import('./project').AgentType;
  }) => void;
  project_status: (data: { status: keyof typeof import('./project').ProjectStatus }) => void;
  terminal_output: (data: { data: string }) => void;
  build_result: (data: {
    success: boolean;
    output: string;
    errors: string[];
  }) => void;
  preview_ready: (data: { url: string }) => void;
}