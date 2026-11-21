import * as vscode from 'vscode';
import { getLogger } from './utils/logger';
import { AgentPanel } from './ui/agentPanel';
import { AgentMode } from './commands/agentMode';
import { runInlineEdit } from './commands/inlineEdit';
import { VoltixDiffProvider } from './review/diffProvider';
import { PendingChanges } from './review/pendingChanges';
import { getActiveStore, getToolPolicy } from './review/activeStore';
import { applyAndRecord, undoLastApply, canUndo } from './review/undoStack';
import { captureOriginalFile } from './review/conflictDetector';
import { startMcpServer } from './tools/mcpServer';
import { guardWorkspacePath } from './tools/pathGuard';
import { formatForAgent, resetVerification, verifyPending } from './verify/verifier';
import { passportToMarkdown } from './review/passport';
import { FuturesEngine } from './futures/futuresEngine';
import { getSettings } from './config/settings';

let mcpServer: import('node:http').Server | undefined;

export async function activate(context: vscode.ExtensionContext) {
  const logger = getLogger();
  logger.appendLine('Voltix activated');
  const diffProvider = new VoltixDiffProvider();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('voltix', diffProvider)
  );

  let panel: AgentPanel | undefined;
  let agentMode: AgentMode | undefined;
  let agentRunning = false;
  let inlineRunning = false;
  const futures = new FuturesEngine(
    message => panel?.post(message),
    passport => { if (agentMode) agentMode.lastPassport = passport; }
  );
  const openPanel = () => {
    if (!panel) {
      const newPanel = new AgentPanel(context.extensionUri);
      panel = newPanel;
      if (agentMode) agentMode.setPanel(newPanel);
      else agentMode = new AgentMode(newPanel);
      newPanel.setInboundHandler(async message => {
        if (message.type === 'submit') {
          if (futures.busy || inlineRunning) {
            newPanel.post({ type: 'error', message: 'Wait for the current Voltix run to finish, or cancel it.', recoverable: true });
            return;
          }
          agentRunning = true;
          try { await agentMode?.submit(message.text); } catch (error) {
            newPanel.post({ type: 'error', message: error instanceof Error ? error.message : 'Request failed', recoverable: true });
          } finally {
            agentRunning = false;
          }
        } else if (message.type === 'cancel') {
          try {
            if (futures.busy) await futures.cancel();
            else await agentMode?.cancel();
          } catch (error) {
            newPanel.post({ type: 'error', message: error instanceof Error ? error.message : 'Cancellation failed', recoverable: true });
          }
        } else if (message.type === 'panel_ready') {
          newPanel.post({ type: 'futures_config', probeCommand: getSettings().futuresProbeCommand });
          futures.replay();
        } else if (message.type === 'explore_futures') {
          if (agentRunning || inlineRunning) {
            newPanel.post({ type: 'error', message: 'Wait for the current Voltix run to finish before exploring futures.', recoverable: true });
            return;
          }
          try { await futures.explore(message.text, message.probeCommand); } catch (error) {
            newPanel.post({ type: 'error', message: error instanceof Error ? error.message : 'Exploring futures failed', recoverable: true });
          }
        } else if (message.type === 'choose_future') {
          try { await futures.choose(message.futureId); } catch (error) {
            newPanel.post({ type: 'error', message: error instanceof Error ? error.message : 'Choosing the future failed', recoverable: true });
          }
        } else if (message.type === 'discard_futures') {
          await futures.discard();
        } else if (message.type === 'accept_hunk') {
          PendingChanges.acceptHunk(message.changeId, message.hunkId);
        } else if (message.type === 'reject_hunk') {
          PendingChanges.rejectHunk(message.changeId, message.hunkId);
        } else if (message.type === 'accept_file') {
          PendingChanges.acceptFile(message.changeId);
        } else if (message.type === 'reject_file') {
          PendingChanges.rejectFile(message.changeId);
        } else if (message.type === 'apply_accepted') {
          applyWithUndo();
        } else if (message.type === 'discard_all') {
          await futures.discard();
          for (const change of PendingChanges.getAll()) newPanel.post({ type: 'change_removed', changeId: change.id });
          PendingChanges.clear();
          resetVerification();
          if (agentMode) agentMode.lastPassport = null;
          newPanel.post({ type: 'passport', passport: null });
        } else if (message.type === 'copy_passport') {
          const passport = agentMode?.lastPassport;
          if (passport) {
            await vscode.env.clipboard.writeText(passportToMarkdown(passport));
            void vscode.window.showInformationMessage('Voltix: Change Passport copied as Markdown (paste it into your PR or commit message).');
          }
        }
      });
      newPanel.onDidDispose(() => {
        if (panel === newPanel) panel = undefined;
      });
      for (const change of PendingChanges.getAll()) {
        newPanel.post({ type: 'pending_change', change });
      }
    }
    panel.reveal();
  };

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
  };

  const applyWithUndo = () => {
    const result = applyAndRecord(PendingChanges.getAll());
    panel?.post({ type: 'apply_result', ...result });
    if (result.applied.length) {
      void vscode.window.showInformationMessage(
        `Voltix applied ${result.applied.length} file(s): ${result.applied.join(', ')}`,
        'Undo'
      ).then(choice => { if (choice === 'Undo') undo(); });
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('voltix.openPanel', openPanel),
    vscode.commands.registerCommand('voltix.undoLastApply', undo),
    vscode.commands.registerCommand('voltix.inlineEdit', async () => {
      // Inline edit reads the default store, so it must not share the MCP tools with a running future.
      if (futures.busy || agentRunning || inlineRunning) {
        void vscode.window.showWarningMessage('Voltix: wait for the current run to finish before starting an inline edit.');
        return;
      }
      inlineRunning = true;
      try {
        await runInlineEdit(diffProvider);
      } finally {
        inlineRunning = false;
      }
    }),
    vscode.commands.registerCommand('voltix.applyAccepted', applyWithUndo),
    vscode.commands.registerCommand('voltix.acceptInlineEdit', () => {
      const active = PendingChanges.getAll().at(-1);
      if (active) PendingChanges.acceptFile(active.id);
    }),
    vscode.commands.registerCommand('voltix.rejectInlineEdit', () => {
      const active = PendingChanges.getAll().at(-1);
      if (active) PendingChanges.rejectFile(active.id);
    }),
    vscode.commands.registerCommand('voltix.discardAll', async () => {
      await futures.discard();
      PendingChanges.clear();
    })
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
        if (isDefault) panel?.post({ type: 'verification', phase: 'running', command, summary: 'Agent is running the tests against its pending changes in a sandbox…', round: 0, maxRounds: 0, source: 'agent' });
        const record = await verifyPending(command, 'agent', store);
        if (isDefault) {
          panel?.post({
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
          if (isDefault) panel?.post({ type: 'change_removed', changeId: existing.id });
        }
        const reason = existing && existing.reason !== input.reason ? `${existing.reason}\n${input.reason}` : input.reason;
        const change = store.add({
          path: vscode.workspace.asRelativePath(guarded.absPath),
          absPath: guarded.absPath,
          ...original,
          proposedContent: input.proposedContent,
          reason,
        });
        if (isDefault) panel?.post({ type: 'pending_change', change });
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
