'use client';

import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalProps {
  projectId: string;
  onCommandExec?: (command: string) => void;
}

const TERM_THEME = {
  background: '#0a0a14',
  foreground: '#c9d1d9',
  cursor: '#00d4ff',
  cursorAccent: '#0a0a14',
  selectionBackground: '#00d4ff33',
  black: '#161b22',
  red: '#f85149',
  green: '#3fb950',
  yellow: '#d2991d',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#00d4ff',
  white: '#b1bac4',
  brightBlack: '#484f58',
  brightRed: '#ff7b72',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#39d2ff',
  brightWhite: '#f0f6fc',
};

export function Terminal({ projectId, onCommandExec }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;
    const container = terminalRef.current;

    // Don't initialize if container has zero dimensions (hidden panel)
    if (container.offsetWidth === 0 || container.offsetHeight === 0) return;

    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: '"JetBrains Mono", "Geist Mono", Menlo, Monaco, monospace',
      theme: TERM_THEME,
      allowProposedApi: true,
      letterSpacing: 0.5,
      lineHeight: 1.6,
    });

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    xtermRef.current = term;

    let inputBuffer = '';

    term.onData((data) => {
      if (data === '\r') {
        term.writeln('');
        if (inputBuffer.trim() && onCommandExec) {
          onCommandExec(inputBuffer.trim());
        }
        inputBuffer = '';
        term.write('\x1b[36m❯ \x1b[0m');
      } else if (data === '\x7f') {
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          term.write('\b \b');
        }
      } else if (data === '\x03') {
        term.writeln('^C');
        inputBuffer = '';
        term.write('\r\n\x1b[36m❯ \x1b[0m');
      } else {
        inputBuffer += data;
        term.write(data);
      }
    });

    term.writeln('\x1b[1;36m  ⚡ SwarmDev Terminal\x1b[0m');
    term.writeln('\x1b[90m  project: ' + projectId + '\x1b[0m');
    term.writeln('');
    term.write('\x1b[36m❯ \x1b[0m');

    const safeFit = () => {
      if (container.offsetWidth > 0 && container.offsetHeight > 0) {
        try { fitAddon.fit(); } catch { /* ignore fit errors on zero-size */ }
      }
    };
    const handleResize = () => safeFit();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => safeFit());
    observer.observe(container);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      term.dispose();
    };
  }, [projectId]);

  const clear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
      xtermRef.current.write('\x1b[36m❯ \x1b[0m');
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0a0a14]">
      <div className="flex items-center justify-between border-b border-border/20 bg-[#0d0d1a] px-4 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-accent/60" />
          </div>
          <span className="ml-2 text-[11px] text-muted-foreground">Terminal</span>
        </div>
        <button
          onClick={clear}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          clear
        </button>
      </div>
      <div ref={terminalRef} className="flex-1 overflow-hidden" />
    </div>
  );
}
