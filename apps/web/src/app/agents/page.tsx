'use client';

import React, { useEffect, useState } from 'react';
import socket from '../socket';

interface AgentEvent {
  agent: string;
  status: string;
  summary?: string;
}

export default function AgentsPage() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [workflowResult, setWorkflowResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen for agent_done events from the orchestrator.
    socket.on('agent_done', (data: AgentEvent) => {
      setEvents((prev) => [...prev, data]);
    });
    // Cleanup on unmount
    return () => {
      socket.off('agent_done');
    };
  }, []);

  const startProject = async () => {
    setLoading(true);
    try {
      const secret = process.env.NEXT_PUBLIC_API_SECRET || 'devsecret';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/demo/agents/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-SECRET': secret,
        },
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setWorkflowResult(data);
    } catch (e) {
      console.error('Error starting project', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">SwarmDev Orchestration Dashboard</h1>
      <button
        onClick={startProject}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Starting…' : 'Start Demo Project'}
      </button>

      {workflowResult && (
        <pre className="mt-4 bg-gray-100 p-2 rounded">
          {JSON.stringify(workflowResult, null, 2)}
        </pre>
      )}

      <h2 className="mt-6 text-xl font-semibold">Agent Events</h2>
      <ul className="mt-2 space-y-2">
        {events.map((e, idx) => (
          <li key={idx} className="p-2 border rounded">
            <strong>{e.agent}</strong>: {e.status}
            {e.summary && <span> – {e.summary}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
