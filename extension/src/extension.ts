import * as path from 'node:path';
import { execFile } from 'node:child_process';
import * as vscode from 'vscode';
import type { FutureId, PanelInboundMessage } from '../../shared/types';
import { getLogger } from './utils/logger';
import { AgentPanel } from './ui/agentPanel';
import { AgentViewProvider } from './ui/agentViewProvider';
import { SurfaceHub, type AgentSurface } from './ui/surfaceHub';
import { AgentMode } from './commands/agentMode';
import { runInlineEdit } from './commands/inlineEdit';
import { VoltixDiffProvider } from './review/diffProvider';
import { HunkCodeLensProvider } from './review/hunkCodeLensProvider';
import { PendingChanges } from './review/pendingChanges';
import { getActiveStore, getToolPolicy } from './review/activeStore';
import { applyAndRecord, undoLastApply, canUndo, lastAppliedFiles } from './review/undoStack';
import { captureOriginalFile } from './review/conflictDetector';
import { startMcpServer } from './tools/mcpServer';
import { guardWorkspacePath } from './tools/pathGuard';
import { formatForAgent, resetVerification, verifyPending } from './verify/verifier';
import { passportToMarkdown } from './review/passport';
import { FuturesEngine } from './futures/futuresEngine';
import { getSettings } from './config/settings';
import { getWorkspaceRoot } from './tools/pathGuard';

let mcpServer: import('node:http').Server | undefined;

export async function activate(context: vscode.ExtensionContext) {
  const logger = getLogger();
  logger.appendLine('Voltix activated');
  const diffProvider = new VoltixDiffProvider();
  const hunkCodeLens = new HunkCodeLensProvider(diffProvider, id => PendingChanges.get(id));
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('voltix', diffProvider),
    vscode.languages.registerCodeLensProvider({ scheme: 'voltix' }, hunkCodeLens),
    hunkCodeLens
  );

  const hub = new SurfaceHub();
  const agentMode = new AgentMode(hub);
  let stopPressedAt: number | undefined;
  let proofInFlight = false;
  let finishSafetyProof: (kind: 'stopped' | 'failed' | 'discarded', cancelConfirmed?: boolean) => Promise<void> = async () => undefined;
  const checkConnection = async (target: AgentSurface = hub) => {
    const baseUrl = getSettings().baseUrl.replace(/\/+$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(baseUrl, { method: 'GET', signal: controller.signal });
      target.post({
        type: 'connection_status',
        connected: response.ok,
        baseUrl,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      });
    } catch (error) {
      target.post({
        type: 'connection_status',
        connected: false,
        baseUrl,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timeout);
    }
  };
  const connectionTimer = setInterval(() => { void checkConnection(); }, 30_000);
  context.subscriptions.push({ dispose: () => clearInterval(connectionTimer) });
  let editorPanel: AgentPanel | undefined;
  let focusFuturesWhenReady = false;
  let agentRunning = false;
  let inlineRunning = false;
  const futures = new FuturesEngine(
    message => {
      hub.post(message);
      if (message.type === 'turn_done' && message.status === 'cancelled' && stopPressedAt !== undefined) {
        void finishSafetyProof('stopped');
      }
    },
    passport => { agentMode.lastPassport = passport; }
  );
  const errorText = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;
  const postHistory = (target: AgentSurface = hub) =>
    target.post({ type: 'history_state', canUndo: canUndo(), files: lastAppliedFiles() });

  finishSafetyProof = async (kind, cancelConfirmed = true) => {
    if (proofInFlight) return;
    proofInFlight = true;
    const elapsedMs = kind === 'stopped' && cancelConfirmed && stopPressedAt !== undefined
      ? Math.max(0, Date.now() - stopPressedAt)
      : undefined;
    stopPressedAt = undefined;
    PendingChanges.clear();
    resetVerification();
    agentMode.lastPassport = null;
    hub.post({ type: 'review_reset' });
    postHistory();
    try {
      const cwd = getWorkspaceRoot();
      const output = await new Promise<string>((resolve, reject) => {
        execFile('git', ['status', '--porcelain'], { cwd, encoding: 'utf8' }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr.trim() || error.message));
            return;
          }
          resolve(stdout);
        });
      });
      const files = output.split(/\r?\n/).filter(Boolean).map(line => line.slice(3));
      hub.post({ type: 'safety_proof', kind, elapsedMs, cancelConfirmed, clean: files.length === 0, files });
    } catch (error) {
      hub.post({
        type: 'safety_proof',
        kind,
        elapsedMs,
        cancelConfirmed,
        clean: false,
        files: [],
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      proofInFlight = false;
    }
  };

  const discardReview = async () => {
    await futures.discard();
    PendingChanges.clear();
    hunkCodeLens.refresh();
    resetVerification();
    agentMode.lastPassport = null;
    hub.beginRun();
    hub.post({ type: 'review_reset' });
    await finishSafetyProof('discarded');
  };

  const openDiff = async (changeId: string, futureId?: FutureId) => {
    const change = (futureId ? futures.findChange(futureId, changeId) : undefined) ?? PendingChanges.get(changeId);
    if (!change) {
      void vscode.window.showWarningMessage('Voltix: that change is no longer available.');
      return;
    }
    const extension = path.extname(change.path) || '.txt';
    const left = diffProvider.set(`${change.id}-original`, change.originalContent, extension);
    const right = diffProvider.set(change.id, change.proposedContent, extension, futureId ? undefined : change.id);
    const label = futureId
      ? `Future ${futureId}: ${change.path} (original ↔ proposed)`
      : `Review: ${change.path} (${change.hunks.length} hunks)`;
    await vscode.commands.executeCommand('vscode.diff', left, right, label, { preview: true });
  };

  const openInEditor = (focusFutures = false) => {
    if (editorPanel) {
      editorPanel.reveal();
      if (focusFutures) editorPanel.post({ type: 'focus_section', section: 'futures' });
      return;
    }
    focusFuturesWhenReady = focusFutures;
    const created = new AgentPanel(handleInbound);
    editorPanel = created;
    const detach = hub.attach(created);
    created.onDidDispose(() => {
      detach();
      if (editorPanel === created) editorPanel = undefined;
    });
  };

  const syncDecision = (changeId: string) => {
    const change = PendingChanges.get(changeId);
    if (change) {
      hub.post({ type: 'change_decision', change });
      hunkCodeLens.refresh();
    }
  };

  const handleInbound = async (message: PanelInboundMessage, surface: AgentSurface) => {
    if (message.type === 'submit') {
      if (futures.busy || inlineRunning || agentRunning) {
        surface.post({ type: 'error', message: 'Wait for the current Voltix run to finish, or cancel it.', recoverable: true });
        return;
      }
      agentRunning = true;
      hub.beginRun();
      hub.post({ type: 'run_started', mode: 'agent' });
      hub.post({ type: 'chat_message', role: 'user', content: message.text });
      try {
        await agentMode.submit(message.text);
        if (agentMode.lastStatus === 'cancelled' && stopPressedAt !== undefined) await finishSafetyProof('stopped');
      } catch (error) {
        hub.post({ type: 'error', message: errorText(error, 'Request failed'), recoverable: true });
        if (stopPressedAt !== undefined) await finishSafetyProof('stopped', false);
        else await finishSafetyProof('failed');
      } finally {
        agentRunning = false;
      }
    } else if (message.type === 'cancel') {
      stopPressedAt = Number.isFinite(message.requestedAt) ? message.requestedAt : Date.now();
      try {
        if (futures.busy) await futures.cancel();
        else await agentMode.cancel();
      } catch (error) {
        hub.post({ type: 'error', message: errorText(error, 'Cancellation failed'), recoverable: true });
        await finishSafetyProof('stopped', false);
      }
    } else if (message.type === 'panel_ready') {
      surface.post({ type: 'futures_config', probeCommand: getSettings().futuresProbeCommand });
      surface.post({ type: 'model_info', model: getSettings().model });
      surface.post({
        type: 'model_chain',
        models: [getSettings().model, ...getSettings().fallbackModels],
        active: agentMode.currentModel ?? getSettings().model,
      });
      surface.post({ type: 'session_state', sessionId: agentMode.currentSessionId });
      void checkConnection(surface);
      surface.post({ type: 'replay_boundary', phase: 'start' });
      hub.replayTo(surface, PendingChanges.getAll());
      surface.post({ type: 'replay_boundary', phase: 'end' });
      postHistory(surface);
      if (surface === editorPanel && focusFuturesWhenReady) {
        focusFuturesWhenReady = false;
        surface.post({ type: 'focus_section', section: 'futures' });
      }
    } else if (message.type === 'explore_futures') {
      if (agentRunning || inlineRunning) {
        surface.post({ type: 'error', message: 'Wait for the current Voltix run to finish before exploring futures.', recoverable: true });
        return;
      }
      try {
        await futures.explore(message.text, message.probeCommand, () => {
          hub.beginRun();
          hub.post({ type: 'run_started', mode: 'futures' });
          hub.post({ type: 'chat_message', role: 'user', content: message.text });
        });
      } catch (error) {
        hub.post({ type: 'error', message: errorText(error, 'Exploring futures failed'), recoverable: true });
      }
    } else if (message.type === 'choose_future') {
      try { await futures.choose(message.futureId); } catch (error) {
        hub.post({ type: 'error', message: errorText(error, 'Choosing the future failed'), recoverable: true });
      }
    } else if (message.type === 'discard_futures') {
      await futures.discard();
    } else if (message.type === 'accept_hunk') {
      PendingChanges.acceptHunk(message.changeId, message.hunkId);
      syncDecision(message.changeId);
    } else if (message.type === 'reject_hunk') {
      PendingChanges.rejectHunk(message.changeId, message.hunkId);
      syncDecision(message.changeId);
    } else if (message.type === 'accept_file') {
      PendingChanges.acceptFile(message.changeId);
      syncDecision(message.changeId);
    } else if (message.type === 'reject_file') {
      PendingChanges.rejectFile(message.changeId);
      syncDecision(message.changeId);
    } else if (message.type === 'apply_accepted') {
      applyWithUndo();
    } else if (message.type === 'discard_all') {
      await discardReview();
    } else if (message.type === 'copy_passport') {
      const passport = agentMode.lastPassport;
      if (passport) {
        await vscode.env.clipboard.writeText(passportToMarkdown(passport));
        void vscode.window.showInformationMessage('Voltix: Change Passport copied as Markdown (paste it into your PR or commit message).');
      }
    } else if (message.type === 'open_diff') {
      await openDiff(message.changeId, message.futureId);
    } else if (message.type === 'open_in_editor') {
      openInEditor();
    } else if (message.type === 'open_compare') {
      openInEditor(true);
    } else if (message.type === 'undo_last') {
      undo();
    } else if (message.type === 'open_session') {
      const sessionId = agentMode.currentSessionId;
      if (!sessionId) return;
      const settings = getSettings();
      const url = settings.sessionUrlTemplate
        .replace(/\{baseUrl\}/g, settings.baseUrl.replace(/\/+$/, ''))
        .replace(/\{id\}/g, encodeURIComponent(sessionId));
      try {
        await vscode.env.openExternal(vscode.Uri.parse(url));
      } catch (error) {
        void vscode.window.showErrorMessage(`Voltix could not open the TrueForge session: ${errorText(error, 'Invalid session URL')}`);
      }
    }
  };

  const viewProvider = new AgentViewProvider(hub, handleInbound);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(AgentViewProvider.viewType, viewProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  const undo = () => {
    if (!canUndo()) {
      void vscode.window.showInformationMessage('Voltix: nothing to undo.');
      return;
    }
    const { restored, skipped } = undoLastApply();
    const parts = [];
    if (restored.length) parts.push(`restored ${restored.join(', ')}`);
    if (skipped.length) parts.push(`left ${skipped.join(', ')} alone because it was edited after the apply`);
    void vscode.window.showInformationMessage(`Voltix undo: ${parts.join('; ') || 'no files changed'}.`);
    postHistory();
  };

  const applyWithUndo = () => {
    const result = applyAndRecord(PendingChanges.getAll());
    hunkCodeLens.refresh();
    hub.post({ type: 'apply_result', ...result });
    postHistory();
    if (result.applied.length) {
      void vscode.window.showInformationMessage(
        `Voltix applied ${result.applied.length} file(s): ${result.applied.join(', ')}`,
        'Undo'
      ).then(choice => { if (choice === 'Undo') undo(); });
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('voltix.openPanel', () => vscode.commands.executeCommand(`${AgentViewProvider.viewType}.focus`)),
    vscode.commands.registerCommand('voltix.openInEditor', () => openInEditor()),
    vscode.commands.registerCommand('voltix.undoLastApply', undo),
    vscode.commands.registerCommand('voltix.codeLensInfo', () => undefined),
    vscode.commands.registerCommand('voltix.acceptHunk', (changeId: string, hunkId: string) => {
      PendingChanges.acceptHunk(changeId, hunkId);
      syncDecision(changeId);
    }),
    vscode.commands.registerCommand('voltix.rejectHunk', (changeId: string, hunkId: string) => {
      PendingChanges.rejectHunk(changeId, hunkId);
      syncDecision(changeId);
    }),
    vscode.commands.registerCommand('voltix.acceptFile', (changeId: string) => {
      PendingChanges.acceptFile(changeId);
      syncDecision(changeId);
    }),
    vscode.commands.registerCommand('voltix.rejectFile', (changeId: string) => {
      PendingChanges.rejectFile(changeId);
      syncDecision(changeId);
    }),
    vscode.commands.registerCommand('voltix.inlineEdit', async () => {
      // Inline edit reads the default store, so it must not share the MCP tools with a running future.
      if (futures.busy || agentRunning || inlineRunning) {
        void vscode.window.showWarningMessage('Voltix: wait for the current run to finish before starting an inline edit.');
        return;
      }
      inlineRunning = true;
      try {
        await runInlineEdit(diffProvider, changeId => {
          hub.post({ type: 'change_removed', changeId });
          hunkCodeLens.refresh();
        });
      } finally {
        inlineRunning = false;
      }
    }),
    vscode.commands.registerCommand('voltix.applyAccepted', applyWithUndo),
    vscode.commands.registerCommand('voltix.acceptInlineEdit', () => {
      const active = PendingChanges.getAll().at(-1);
      if (active) {
        PendingChanges.acceptFile(active.id);
        syncDecision(active.id);
      }
    }),
    vscode.commands.registerCommand('voltix.rejectInlineEdit', () => {
      const active = PendingChanges.getAll().at(-1);
      if (active) {
        PendingChanges.rejectFile(active.id);
        syncDecision(active.id);
      }
    }),
    vscode.commands.registerCommand('voltix.discardAll', discardReview)
  );

  try {
    // Tools always act on the active store: the normal review list, or the future being built.
    const findPending = (absPath: string) => getActiveStore().getAll().find(change => change.absPath === absPath);
    mcpServer = await startMcpServer(7891, {
      getPendingContent: absPath => findPending(absPath)?.proposedContent,
      editBlockedReason: () => getToolPolicy().allowEdits ? undefined : 'This step is read-only. Do not edit files; reply with the requested JSON.',
      commandBlockedReason: () => getToolPolicy().allowCommands ? undefined : 'run_command is disabled here because it would run in the real workspace. Use verify_changes to run tests in the sandbox.',
      verify: async command => {
        if (!getToolPolicy().allowVerify) throw new Error('This step is read-only. Do not run tests; reply with the requested JSON.');
        const store = getActiveStore();
        const isDefault = store === PendingChanges;
        if (isDefault) hub.post({ type: 'verification', phase: 'running', command, summary: 'Agent is running the tests against its pending changes in a sandbox…', round: 0, maxRounds: 0, source: 'agent' });
        const record = await verifyPending(command, 'agent', store);
        if (isDefault) {
          hub.post({
            type: 'verification', phase: record.passed ? 'passed' : 'failed', command: record.command, summary: record.summary,
            round: 0, maxRounds: 0, source: 'agent', output: record.output.slice(-4000), durationMs: record.durationMs,
          });
        }
        return formatForAgent(record);
      },
      onProposedChange: input => {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) return;
        const guarded = guardWorkspacePath(input.path, root);
        if (!guarded.allowed) return;
        const store = getActiveStore();
        const isDefault = store === PendingChanges;
        // Several edits to one file merge into ONE proposal, diffed against the original on disk.
        const existing = findPending(guarded.absPath);
        const original = existing
          ? { originalExists: existing.originalExists, originalContent: existing.originalContent }
          : captureOriginalFile(guarded.absPath);
        if (existing) {
          store.remove(existing.id);
          if (isDefault) hub.post({ type: 'change_removed', changeId: existing.id });
        }
        const reason = existing && existing.reason !== input.reason ? `${existing.reason}\n${input.reason}` : input.reason;
        const change = store.add({
          path: vscode.workspace.asRelativePath(guarded.absPath),
          absPath: guarded.absPath,
          ...original,
          proposedContent: input.proposedContent,
          reason,
        });
        if (isDefault) {
          hub.post({ type: 'pending_change', change });
          hunkCodeLens.refresh();
        }
      },
    });
    logger.appendLine('MCP server listening on http://127.0.0.1:7891/mcp');
  } catch (error) {
    logger.appendLine(`MCP server failed to start: ${error instanceof Error ? error.message : error}`);
  }
}

export function deactivate() {
  void mcpServer?.close();
}
