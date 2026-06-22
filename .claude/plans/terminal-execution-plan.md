# Plan: Wire up the interactive terminal to a real E2B sandbox

## Problem
The bottom-panel terminal is a visual xterm.js emulator, but typed commands never leave the browser. The execution chain is stubbed:
- `Terminal.tsx` accepts an optional `onCommandExec`, but the project page does not pass one.
- The Socket.io `exec_command` handler in `apps/api/src/socket/index.ts` only emits placeholder text.
- The HTTP `POST /api/projects/:id/terminal/exec` route in `apps/api/src/routes/terminal.ts` returns a hard-coded success message.
- Real E2B sandbox code exists in `apps/api/src/services/sandboxService.ts` but is not called.

## Goal
Make the IDE terminal execute commands in the project's E2B sandbox and print the real stdout/stderr back into the terminal.

## Approach
Use Socket.io as the command transport (aligns with existing real-time architecture). Lazily create the E2B sandbox on first command. Expose an imperative `write` API on the `Terminal` component so the project page can push server output into xterm without re-rendering the whole component.

## Files to modify

### 1. `apps/web/src/components/editor/Terminal.tsx`
- Add `useImperativeHandle` to expose `{ write(data: string), clear() }` to the parent.
- Keep existing local input handling and `onCommandExec` prop.
- Add `React.RefAttributes` to the component type so parents can attach a ref.

### 2. `apps/web/src/app/project/[id]/page.tsx`
- Create `terminalRef = useRef<TerminalHandle>(null)`.
- Use the `socket` object already returned by `useSocket()`.
- Attach a `terminal_output` listener that writes to `terminalRef.current.write()`.
- Pass `onCommandExec` to `<Terminal>` that emits `exec_command` with `{ projectId, command }`.
- Pass `ref={terminalRef}` to `<Terminal>`.

### 3. `apps/api/src/socket/index.ts`
- Import `sandboxService`.
- In the `exec_command` handler:
  1. Validate `projectId` and `command`.
  2. Get existing sandbox or create a new one via `sandboxService`.
  3. Emit `terminal_output` with "Executing: <command>".
  4. Run the command and emit stdout/stderr.
  5. Emit exit-code summary.
  6. Catch errors and emit a clear message (e.g. E2B_API_KEY missing, sandbox creation failed).

### 4. `apps/api/src/services/sandboxService.ts`
- Add `getOrCreateSandbox(projectId: string): Promise<Sandbox>` helper that reuses an existing sandbox or creates one.

### 5. `apps/api/src/routes/terminal.ts`
- Replace the `POST /:projectId/terminal/exec` stub with real execution:
  1. Look up project ownership.
  2. Get or create sandbox.
  3. Run command.
  4. Return `{ stdout, stderr, exitCode }`.
- Keep the SSE stream endpoint for build logs (no change).

## Testing
After implementation, use Playwright MCP to:
1. Open a project page.
2. Focus the bottom terminal.
3. Type `echo hello` and press Enter.
4. Verify `hello` appears as output in the terminal.
5. Verify no console errors or duplicate messages.

## Risks / notes
- E2B sandbox creation is async and may take a few seconds on the first command; we will emit status text so the terminal does not appear frozen.
- If `E2B_API_KEY` is not set, the terminal will show an informative error instead of silently failing.
- The orchestrator does not currently create sandboxes, so the first user terminal command will create the sandbox. This is intentional for lazy provisioning.
