import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import fg from 'fast-glob';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { guardWorkspacePath, getWorkspaceRoot } from './pathGuard';
import { runCommand } from './handlers/runCommand';
import { applySearchReplace, readFileChunk, buildMatcher } from './searchReplace';

export const TEXT_FILE_GLOB = '**/*.{ts,tsx,js,jsx,mjs,cjs,py,pyi,json,md,rst,txt,toml,cfg,ini,yml,yaml,html,css}';
const IGNORE = ['**/node_modules/**', '**/.git/**', '**/.venv/**', '**/venv/**', '**/__pycache__/**', '**/dist/**'];

export interface McpHooks {
  /** Called when the agent proposes new full content for a file. Nothing is written to disk. */
  onProposedChange?: (input: { path: string; proposedContent: string; reason: string }) => void;
  /** Returns the content of a still-pending proposal for this file, so several edit_file calls stack up. */
  getPendingContent?: (absPath: string) => string | undefined;
  /** Runs a test command against the pending changes in a sandbox copy of the workspace. */
  verify?: (command: string) => Promise<string>;
  /** Why edits are refused for the current run (planning is read-only). Undefined means allowed. */
  editBlockedReason?: () => string | undefined;
  /** Why run_command is refused for the current run (futures may only test in the sandbox). */
  commandBlockedReason?: () => string | undefined;
}

type ProposedChangeHandler = McpHooks['onProposedChange'];

// In stateless mode the MCP SDK requires a NEW server + transport for every HTTP request
// (SDK 1.32.2 rejects a reused stateless transport with HTTP 500 on the second request).
function buildServer(hooks: McpHooks): McpServer {
  const server = new McpServer({ name: 'vscode-workspace', version: '1.0.0' });

  (server as any).tool('list_workspace_files', { pattern: z.string().optional() }, async ({ pattern }: { pattern?: string }) => {
    const root = getWorkspaceRoot();
    const files = await fg([pattern || '**/*'], { cwd: root, onlyFiles: true, ignore: IGNORE });
    return { content: [{ type: 'text', text: JSON.stringify(files.slice(0, 500)) }] };
  });

  (server as any).tool('read_file', {
    path: z.string(),
    start_line: z.number().int().positive().optional(),
    end_line: z.number().int().positive().optional(),
  }, async ({ path: file, start_line, end_line }: { path: string; start_line?: number; end_line?: number }) => {
    const guarded = guardWorkspacePath(file);
    if (!guarded.allowed) return { isError: true, content: [{ type: 'text', text: guarded.error }] };
    if (!fs.existsSync(guarded.absPath)) return { isError: true, content: [{ type: 'text', text: 'File not found' }] };
    // Show the agent its own pending (not yet applied) edits, so it can check them.
    const base = hooks.getPendingContent?.(guarded.absPath) ?? fs.readFileSync(guarded.absPath, 'utf8');
    const text = readFileChunk(base, start_line, end_line);
    return { content: [{ type: 'text', text }] };
  });

  (server as any).tool('search_workspace', { query: z.string() }, async ({ query }: { query: string }) => {
    const root = getWorkspaceRoot();
    const matcher = buildMatcher(query);
    const matches: string[] = [];
    const files = await fg([TEXT_FILE_GLOB], { cwd: root, ignore: IGNORE });
    for (const file of files) {
      let lines: string[];
      try { lines = fs.readFileSync(path.resolve(root, file), 'utf8').split(/\r?\n/); } catch { continue; }
      lines.forEach((line, index) => {
        if (matches.length < 200 && matcher(line)) {
          matches.push(`${file}:${index + 1}: ${line.trim().slice(0, 160)}`);
        }
      });
      if (matches.length >= 200) break;
    }
    return { content: [{ type: 'text', text: matches.length ? matches.join('\n') : 'No matches' }] };
  });

  (server as any).tool('edit_file', {
    path: z.string(),
    old_string: z.string(),
    new_string: z.string(),
    reason: z.string(),
  }, async ({ path: file, old_string, new_string, reason }: { path: string; old_string: string; new_string: string; reason: string }) => {
    const editBlocked = hooks.editBlockedReason?.();
    if (editBlocked) return { isError: true, content: [{ type: 'text', text: editBlocked }] };
    const guarded = guardWorkspacePath(file);
    if (!guarded.allowed) return { isError: true, content: [{ type: 'text', text: guarded.error }] };
    if (!fs.existsSync(guarded.absPath)) {
      return { isError: true, content: [{ type: 'text', text: 'File not found. Use propose_file_change to create a new file.' }] };
    }
    const base = hooks.getPendingContent?.(guarded.absPath) ?? fs.readFileSync(guarded.absPath, 'utf8');
    const result = applySearchReplace(base, old_string, new_string);
    if (!result.ok) return { isError: true, content: [{ type: 'text', text: result.error }] };
    hooks.onProposedChange?.({ path: file, proposedContent: result.content, reason });
    return { content: [{ type: 'text', text: 'Edit registered for review (not written to disk yet).' }] };
  });

  (server as any).tool('propose_file_change', {
    path: z.string(),
    proposedContent: z.string(),
    reason: z.string(),
  }, async ({ path: file, proposedContent, reason }: { path: string; proposedContent: string; reason: string }) => {
    const editBlocked = hooks.editBlockedReason?.();
    if (editBlocked) return { isError: true, content: [{ type: 'text', text: editBlocked }] };
    const guarded = guardWorkspacePath(file);
    if (!guarded.allowed) return { isError: true, content: [{ type: 'text', text: guarded.error }] };
    // Whole-file rewrites of existing files silently drop content the model never read
    // (e.g. a 1600-line changelog cut to 20 lines), so existing files must go through edit_file.
    if (fs.existsSync(guarded.absPath) || hooks.getPendingContent?.(guarded.absPath) !== undefined) {
      return { isError: true, content: [{ type: 'text', text: 'This file already exists. Do not rewrite it: use edit_file with an exact old_string and new_string to change only the lines you need.' }] };
    }
    hooks.onProposedChange?.({ path: file, proposedContent, reason });
    return { content: [{ type: 'text', text: 'Change registered for review (not written to disk yet).' }] };
  });

  (server as any).tool('verify_changes', {
    command: z.string(),
  }, async ({ command }: { command: string }) => {
    if (!hooks.verify) return { isError: true, content: [{ type: 'text', text: 'Verification is not available.' }] };
    try {
      return { content: [{ type: 'text', text: await hooks.verify(command) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
    }
  });

  (server as any).tool('run_command', { command: z.string(), cwd: z.string().optional() }, async ({ command, cwd }: { command: string; cwd?: string }) => {
    const commandBlocked = hooks.commandBlockedReason?.();
    if (commandBlocked) return { isError: true, content: [{ type: 'text', text: commandBlocked }] };
    const root = getWorkspaceRoot();
    const resolvedCwd = cwd ? path.resolve(root, cwd) : root;
    if (resolvedCwd !== root && !resolvedCwd.startsWith(root + path.sep)) {
      return { isError: true, content: [{ type: 'text', text: 'Working directory is outside workspace' }] };
    }
    try {
      const result = await runCommand(command, resolvedCwd);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : 'Command failed' }] };
    }
  });

  return server;
}

export async function startMcpServer(
  port = 7891,
  hooksOrHandler?: McpHooks | ProposedChangeHandler
): Promise<http.Server> {
  const hooks: McpHooks = typeof hooksOrHandler === 'function' ? { onProposedChange: hooksOrHandler } : (hooksOrHandler ?? {});
  const httpServer = http.createServer(async (req, res) => {
    if (req.url?.split('?')[0] !== '/mcp') {
      res.writeHead(404).end();
      return;
    }
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' }).end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      }));
      return;
    }

    try {
      const server = buildServer(hooks);
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        }));
      }
    }
  });
  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(port, '127.0.0.1', resolve);
  });
  return httpServer;
}
