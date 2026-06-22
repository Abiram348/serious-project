'use client';

import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

export interface TerminalHandle {
  write: (data: string) => void;
  clear: () => void;
}

interface TerminalProps {
  projectId: string;
  onCommandExec?: (command: string) => void;
  clearSignal?: number;
  showHeader?: boolean;
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

function TerminalComponent({ projectId, onCommandExec, clearSignal, showHeader = true }: TerminalProps, ref: React.Ref<TerminalHandle>) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    term: any;
    fitAddon: any;
    disposed: boolean;
    observer: ResizeObserver | null;
    inputBuffer: string;
  }>({ term: null, fitAddon: null, disposed: false, observer: null, inputBuffer: '' });
  const onCommandExecRef = useRef(onCommandExec);
  onCommandExecRef.current = onCommandExec;

  // Expose imperative write/clear methods to parent so server output can be
  // pushed into the terminal without re-rendering the component.
  useImperativeHandle(ref, () => ({
    write: (data: string) => {
      const state = stateRef.current;
      if (state.term && !state.disposed) {
        state.term.write(data);
      }
    },
    clear: () => {
      const state = stateRef.current;
      if (state.term && !state.disposed) {
        state.term.clear();
        state.term.write('\x1b[36m❯ \x1b[0m');
        state.inputBuffer = '';
      }
    },
  }), []);

  // xterm leaves an off-screen measurement DIV on document.body. Remove any
  // existing ones before creating a new terminal to avoid DOM leaks, and hide
  // the new one from accessibility trees.
  const cleanupXtermMeasureElements = useCallback(() => {
    if (typeof document === 'undefined') return;
    const bodyChildren = Array.from(document.body.children);
    for (const child of bodyChildren) {
      if (child.tagName !== 'DIV') continue;
      if (child.className || child.id) continue;
      const style = (child as HTMLElement).style;
      if (style.position === 'absolute' && style.top === '-50000px') {
        child.setAttribute('aria-hidden', 'true');
        document.body.removeChild(child);
      }
    }
  }, []);

  const hideXtermMeasureElement = useCallback(() => {
    if (typeof document === 'undefined') return;
    const bodyChildren = Array.from(document.body.children);
    for (const child of bodyChildren) {
      if (child.tagName !== 'DIV') continue;
      if (child.className || child.id) continue;
      const style = (child as HTMLElement).style;
      if (style.position === 'absolute' && style.top === '-50000px') {
        child.setAttribute('aria-hidden', 'true');
        child.setAttribute('role', 'none');
        (child as HTMLElement).inert = true;
      }
    }
  }, []);

  useEffect(() => {
    cleanupXtermMeasureElements();

    const container = terminalRef.current;
    if (!container) return;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) return;

    const state = stateRef.current;

    // Guard against duplicate xterm instances (Strict Mode remounts, fast re-renders).
    if (state.term) {
      try { state.term.dispose(); } catch { /* ignore */ }
      state.term = null;
      state.fitAddon = null;
    }
    if (container.hasAttribute('data-terminal-initialized')) {
      container.removeAttribute('data-terminal-initialized');
    }

    state.disposed = false;

    (async () => {
      const [{ Terminal: XTerm }, { FitAddon }] = await Promise.all([
        import('xterm'),
        import('xterm-addon-fit'),
      ]);
      await import('xterm/css/xterm.css');

      if (state.disposed || !terminalRef.current) return;
      // Another instance may have been created while we awaited imports.
      if (terminalRef.current.hasAttribute('data-terminal-initialized')) return;

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
      term.loadAddon(fitAddon);
      state.term = term;
      state.fitAddon = fitAddon;

      if (state.disposed || !terminalRef.current) {
        try { term.dispose(); } catch { /* ignore */ }
        return;
      }

      // Clear any leftover DOM from a previous instance before opening.
      while (terminalRef.current.firstChild) {
        terminalRef.current.removeChild(terminalRef.current.firstChild);
      }
      terminalRef.current.setAttribute('data-terminal-initialized', 'true');
      term.open(terminalRef.current);
      hideXtermMeasureElement();
      try { fitAddon.fit(); } catch { /* ignore */ }

      term.onData((data: string) => {
        if (state.disposed) return;
        if (data === '\r') {
          term.writeln('');
          const exec = onCommandExecRef.current;
          if (state.inputBuffer.trim() && exec) {
            exec(state.inputBuffer.trim());
          }
          state.inputBuffer = '';
          term.write('\x1b[36m❯ \x1b[0m');
        } else if (data === '\x7f') {
          if (state.inputBuffer.length > 0) {
            state.inputBuffer = state.inputBuffer.slice(0, -1);
            term.write('\b \b');
          }
        } else if (data === '\x03') {
          term.writeln('^C');
          state.inputBuffer = '';
          term.write('\r\n\x1b[36m❯ \x1b[0m');
        } else {
          state.inputBuffer += data;
          term.write(data);
        }
      });

      term.writeln('\x1b[1;36m  ⚡ SwarmDev Terminal\x1b[0m');
      term.writeln('\x1b[90m  project: ' + projectId + '\x1b[0m');
      term.writeln('');
      term.write('\x1b[36m❯ \x1b[0m');
    })();

    const safeFit = () => {
      if (state.disposed) return;
      if (state.term && state.fitAddon && container.offsetWidth > 0 && container.offsetHeight > 0) {
        try { state.fitAddon.fit(); } catch { /* ignore */ }
      }
    };

    const handleResize = () => safeFit();
    window.addEventListener('resize', handleResize);

    const observer = new ResizeObserver(() => safeFit());
    observer.observe(container);
    state.observer = observer;

    return () => {
      state.disposed = true;
      state.inputBuffer = '';
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      if (state.term) {
        try { state.term.dispose(); } catch { /* ignore */ }
        state.term = null;
      }
      state.fitAddon = null;
      state.observer = null;
      if (container) {
        container.removeAttribute('data-terminal-initialized');
      }
      // xterm may leave a measurement DIV on body; clean it up after disposal.
      cleanupXtermMeasureElements();
    };
  }, [projectId, cleanupXtermMeasureElements, hideXtermMeasureElement]);

  // External clear signal
  useEffect(() => {
    const state = stateRef.current;
    if (clearSignal === undefined || !state.term || state.disposed) return;
    state.term.clear();
    state.term.write('\x1b[36m❯ \x1b[0m');
    state.inputBuffer = '';
  }, [clearSignal]);

  const clear = useCallback(() => {
    const state = stateRef.current;
    if (state.term && !state.disposed) {
      state.term.clear();
      state.term.write('\x1b[36m❯ \x1b[0m');
      state.inputBuffer = '';
    }
  }, []);

  return (
    <div className="flex h-full flex-col bg-[#0a0a14]">
      {showHeader && (
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
      )}
      {/* The terminal is a visual/emulator surface; hide its noisy xterm DOM from assistive trees. */}
      <div ref={terminalRef} className="flex-1 overflow-hidden" aria-hidden="true" />
    </div>
  );
}

export const Terminal = forwardRef(TerminalComponent);
