'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore, AVAILABLE_MODELS, AVAILABLE_AGENTS } from '@/store/chatStore';
import { ChatMessage } from './ChatMessage';
import { ModelSelector } from './ModelSelector';
import { AgentMention } from './AgentMention';
import { ModelPreferencesPanel } from './ModelPreferencesPanel';
import {
  Send, Loader2, Trash2, Settings, Bot, Sparkles, Lightbulb,
  Palette, Database, Shield
} from 'lucide-react';

interface ChatWindowProps {
  projectId: string;
}

const SUGGESTED_PROMPTS = [
  { icon: Sparkles, label: 'Plan project structure', text: '@supervisor Help me plan the architecture for this project' },
  { icon: Palette, label: 'Improve UI design', text: '@frontend Make the UI more modern and beautiful' },
  { icon: Database, label: 'Add database schema', text: '@database Design the database schema for users and posts' },
  { icon: Shield, label: 'Security review', text: '@security Review the authentication flow for vulnerabilities' },
  { icon: Lightbulb, label: 'General help', text: 'How do I add pagination to my API endpoints?' },
];

export function ChatWindow({ projectId }: ChatWindowProps) {
  const {
    messages, loading, isTyping, selectedModel, selectedAgent,
    fetchMessages, sendMessage, setSelectedModel, setSelectedAgent, setTyping,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [showPrefs, setShowPrefs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages(projectId);
  }, [projectId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    await sendMessage(projectId, input);
    setInput('');
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setInput(val);
    setCursorPos(pos);

    // Show mention popup if @ is typed and followed by word characters
    const beforeCursor = val.slice(0, pos);
    const lastAt = beforeCursor.lastIndexOf('@');
    if (lastAt !== -1) {
      const afterAt = beforeCursor.slice(lastAt + 1);
      // Show if no space after @ (still typing agent name)
      if (!afterAt.includes(' ')) {
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const handleMentionSelect = useCallback((agentId: string) => {
    const beforeCursor = input.slice(0, cursorPos);
    const lastAt = beforeCursor.lastIndexOf('@');
    if (lastAt !== -1) {
      const before = input.slice(0, lastAt);
      const after = input.slice(cursorPos);
      const newValue = `${before}@${agentId.toLowerCase()} ${after}`;
      setInput(newValue);
      setShowMentions(false);
      // Also set the selected agent
      setSelectedAgent(agentId);
      // Focus back on input after a tick
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [input, cursorPos, setSelectedAgent]);

  const handleClear = async () => {
    if (!confirm('Clear all chat messages?')) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, { method: 'DELETE' });
      if (res.ok) {
        useChatStore.getState().clearMessages();
      }
    } catch (e) {
      console.error('Failed to clear chat:', e);
    }
  };

  const handleSuggestedPrompt = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const selectedAgentLabel = AVAILABLE_AGENTS.find(a => a.id === selectedAgent)?.label || 'Auto';

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 bg-surface/50">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Agent Chat</h3>
            <p className="text-[11px] text-muted-foreground">
              {messages.length} messages · {selectedAgentLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPrefs(true)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-hover transition-colors"
            title="Model Preferences"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <h4 className="text-base font-semibold text-foreground">Chat with your Agents</h4>
            <p className="mt-1 text-xs text-muted-foreground max-w-[240px]">
              Ask questions, request changes, or get help from any agent. Use @mentions to direct your message.
            </p>

            {/* Suggested prompts */}
            <div className="mt-5 grid grid-cols-1 gap-2 w-full max-w-[280px]">
              {SUGGESTED_PROMPTS.map((prompt, idx) => {
                const Icon = prompt.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedPrompt(prompt.text)}
                    className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-surface/50 px-3 py-2.5 text-left text-sm text-foreground hover:bg-surface-hover hover:border-primary/30 transition-all"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="font-medium text-xs">{prompt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                id={msg.id}
                role={msg.role}
                agentType={msg.agentType}
                targetAgent={msg.targetAgent}
                model={msg.model}
                content={msg.content}
                createdAt={msg.createdAt}
              />
            ))}
            {isTyping && (
              <div className="flex gap-2.5 animate-fade-in">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-elevated border border-border/40">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />
                </div>
                <div className="rounded-xl bg-surface-elevated border border-border/50 px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border/40 bg-surface/50 px-4 py-3">
        {/* Model + Agent selectors */}
        <div className="flex items-center gap-2 mb-2">
          <ModelSelector value={selectedModel} onChange={setSelectedModel} size="sm" />
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-px bg-border/60" />
            <select
              value={selectedAgent || ''}
              onChange={(e) => setSelectedAgent(e.target.value || null)}
              className="rounded-lg border border-border/60 bg-surface/80 text-[11px] px-2 py-1 font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/30 hover:bg-surface transition-colors cursor-pointer"
            >
              {AVAILABLE_AGENTS.map((a) => (
                <option key={a.id || 'auto'} value={a.id || ''}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          {selectedAgent && (
            <button
              onClick={() => setSelectedAgent(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="relative">
          <AgentMention
            input={input}
            cursorPosition={cursorPos}
            onSelect={handleMentionSelect}
            visible={showMentions}
          />
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInputChange}
              onKeyUp={(e) => setCursorPos((e.target as HTMLInputElement).selectionStart || 0)}
              onClick={(e) => setCursorPos((e.target as HTMLInputElement).selectionStart || 0)}
              placeholder={selectedAgent ? `Message ${selectedAgent.toLowerCase()}...` : "Ask anything or @mention an agent..."}
              disabled={isTyping}
              className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              {isTyping ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>

        <p className="mt-1.5 text-[10px] text-muted-foreground/70 text-center">
          Tip: Type @frontend, @backend, @database, etc. to direct your message
        </p>
      </div>

      {/* Model Preferences Panel */}
      <ModelPreferencesPanel
        projectId={projectId}
        open={showPrefs}
        onClose={() => setShowPrefs(false)}
      />
    </div>
  );
}
