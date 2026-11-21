import * as vscode from 'vscode';
import { createSession } from '../agent/session';
import { getModelChain } from '../config/settings';
import { guardWorkspacePath } from '../tools/pathGuard';
import { PendingChanges } from '../review/pendingChanges';
import { applyAndRecord } from '../review/undoStack';
import { VoltixDiffProvider } from '../review/diffProvider';
import { getLogger } from '../utils/logger';

/**
 * Inline Edit: the user selects code, presses the keybinding and types an instruction.
 * The Voltix agent proposes the change through the vscode-workspace MCP tools
 * (edit_file / propose_file_change), so nothing is written to disk until the user accepts.
 * If the configured model fails, the next model in voltix.fallbackModels is used automatically.
 */
export async function runInlineEdit(provider: VoltixDiffProvider, onRemoved?: (changeId: string) => void) {
  const drop = (changeId: string) => {
    PendingChanges.remove(changeId);
    onRemoved?.(changeId);
  };
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Voltix: open a file and select some code first.');
    return;
  }
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    vscode.window.showWarningMessage('Voltix: open a folder (workspace) first.');
    return;
  }
  const guarded = guardWorkspacePath(editor.document.uri.fsPath, workspaceRoot);
  if (!guarded.allowed) {
    vscode.window.showErrorMessage(guarded.error);
    return;
  }

  const instruction = await vscode.window.showInputBox({ prompt: 'Voltix inline edit: describe the change', ignoreFocusOut: true });
  if (!instruction) return;
  if (editor.document.isDirty) await editor.document.save();

  const rel = vscode.workspace.asRelativePath(editor.document.uri, false);
  const selection = editor.selection;
  const selectedText = editor.document.getText(selection);
  const startLine = selection.start.line + 1;
  const endLine = selection.end.line + 1;

  const prompt = [
    `Inline edit request for the file "${rel}".`,
    selectedText
      ? `Change only the selected code (lines ${startLine}-${endLine}):\n${selectedText}`
      : 'No code is selected; make the smallest change that satisfies the instruction.',
    `Instruction: ${instruction}`,
    `Call edit_file with path "${rel}", old_string = the exact selected code above (or the exact part of it you change), new_string = the replacement, and a short reason.`,
    'Do not change anything outside the selection. Do not print code in chat. After proposing, reply with one short sentence.',
  ].join('\n');

  const models = getModelChain();
  const errors: string[] = [];
  let change: ReturnType<typeof PendingChanges.get>;
  let cancelled = false;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: `Voltix: inline edit for ${rel}`, cancellable: true },
    async (progress, token) => {
      for (let index = 0; index < models.length && !change && !cancelled; index++) {
        const model = models[index];
        progress.report({ message: `asking ${model}…` });
        const knownIds = new Set(PendingChanges.getAll().map(item => item.id));
        try {
          const { client, sessionId } = await createSession(model);
          const sub = token.onCancellationRequested(() => {
            cancelled = true;
            void client.sessions.cancel(sessionId, {}).catch(() => undefined);
          });
          let turnError: string | undefined;
          try {
            const stream = await client.sessions.createTurnStream(sessionId, {
              input: [{ type: 'user.message', content: prompt }],
            });
            for await (const event of stream) {
              if (event.type === 'turn.done') {
                if (event.state.status === 'error') turnError = event.state.message || 'The model returned an error';
                break;
              }
            }
          } finally {
            sub.dispose();
          }
          change = PendingChanges.getAll()
            .filter(item => !knownIds.has(item.id))
            .filter(item => item.path === rel || item.absPath === guarded.absPath)
            .at(-1);
          if (!change && turnError) throw new Error(turnError);
          if (!change && !cancelled) throw new Error('the agent finished without proposing a change');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`${model}: ${message}`);
          getLogger().appendLine(`Inline edit with ${model} failed: ${message}`);
          if (index < models.length - 1 && !cancelled) {
            void vscode.window.showWarningMessage(
              `Voltix: model "${model}" failed (${message}). Switching automatically to "${models[index + 1]}".`
            );
          }
        }
      }
    }
  );

  if (cancelled) {
    if (change) drop(change.id);
    vscode.window.showInformationMessage('Voltix: inline edit cancelled. No files were changed.');
    return;
  }
  if (!change) {
    vscode.window.showErrorMessage(
      `Voltix could not complete the inline edit. ${errors.join(' | ')}. No files were changed.`
    );
    return;
  }
  if (change.hunks.length === 0) {
    drop(change.id);
    vscode.window.showInformationMessage('Voltix: the agent proposed no actual changes.');
    return;
  }

  // Original (left) vs proposed (right). The real file is untouched until the user accepts.
  const right = provider.set(change.id, change.proposedContent);
  await vscode.commands.executeCommand('vscode.diff', editor.document.uri, right, `Voltix Inline Edit: ${rel} (${change.hunks.length} hunk${change.hunks.length === 1 ? '' : 's'})`);

  const choice = await vscode.window.showInformationMessage(
    `Voltix: ${change.reason || instruction}`,
    'Accept & Apply',
    'Review Hunks',
    'Reject'
  );

  if (choice === 'Accept & Apply') {
    PendingChanges.acceptFile(change.id);
    const result = applyAndRecord([change]);
    if (result.applied.length) {
      onRemoved?.(change.id);
      const undo = await vscode.window.showInformationMessage(`Voltix: applied inline edit to ${rel}.`, 'Undo');
      if (undo === 'Undo') await vscode.commands.executeCommand('voltix.undoLastApply');
    } else if (result.conflicts.length) {
      vscode.window.showErrorMessage(`Voltix: ${rel} changed since the edit was proposed. Nothing was written.`);
    } else {
      vscode.window.showErrorMessage(`Voltix: could not apply the edit to ${rel}. Nothing was written.`);
    }
  } else if (choice === 'Review Hunks') {
    // Per-hunk accept/reject needs the wide view, then Apply Accepted.
    await vscode.commands.executeCommand('voltix.openInEditor');
  } else {
    drop(change.id);
    vscode.window.showInformationMessage('Voltix: inline edit rejected. No files were modified.');
  }
}
