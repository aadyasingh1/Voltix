import * as vscode from 'vscode';
import type { Hunk, PendingChange } from '../../../shared/types';
import { PendingChanges } from './pendingChanges';
import { applyHunkToText } from './hunkApplicator';
import { recordInlineAppliedFile } from './undoStack';
import type { VoltixDiffProvider } from './diffProvider';

interface InlineSession {
  change: PendingChange;
  editor: vscode.TextEditor;
  provider: VoltixDiffProvider;
  currentContent: string;
  lineDelta: number;
  total: number;
  applied: number;
  onRemoved?: (changeId: string) => void;
  onActivity?: (text: string) => void;
  refresh?: () => void;
  statusBar?: vscode.StatusBarItem;
}

const sessions = new Map<string, InlineSession>();
let generationCancel: (() => void) | undefined;

export function setInlineGenerationCancel(cancel: (() => void) | undefined): void {
  generationCancel = cancel;
}

export function startInlineHunkSession(
  change: PendingChange,
  editor: vscode.TextEditor,
  provider: VoltixDiffProvider,
  onRemoved?: (changeId: string) => void,
  onActivity?: (text: string) => void,
  refresh?: () => void
): void {
  sessions.set(change.id, {
    change,
    editor,
    provider,
    currentContent: editor.document.getText(),
    lineDelta: 0,
    total: change.hunks.length,
    applied: 0,
    onRemoved,
    onActivity,
    refresh,
  });
  void vscode.commands.executeCommand('setContext', 'voltix.inlineSessionActive', true);
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = `Voltix: 0 of ${change.hunks.length} hunks applied`;
  status.show();
  const session = sessions.get(change.id);
  if (session) session.statusBar = status;
}

export function getInlineSession(changeId: string): InlineSession | undefined {
  return sessions.get(changeId);
}

export async function acceptInlineHunk(changeId: string, hunkId: string): Promise<boolean> {
  const session = sessions.get(changeId);
  if (!session) return false;
  const hunk = session.change.hunks.find(item => item.id === hunkId);
  if (!hunk) return false;
  const document = session.editor.document;
  if (document.getText() !== session.currentContent) {
    void vscode.window.showErrorMessage('Voltix: the file changed after the inline proposal. Nothing else was applied.');
    return false;
  }
  const nextContent = applyHunkToText(session.currentContent, hunk, session.lineDelta);
  if (nextContent === session.currentContent) {
    PendingChanges.removeHunk(changeId, hunkId);
  } else {
    const previousContent = session.currentContent;
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(0, 0, document.lineCount, 0);
    edit.replace(document.uri, fullRange, nextContent);
    const applied = await vscode.workspace.applyEdit(edit);
    if (!applied) return false;
    const added = hunk.lines.filter(line => line.type === 'add').length;
    const removed = hunk.lines.filter(line => line.type === 'remove').length;
    session.lineDelta += added - removed;
    session.currentContent = nextContent;
    session.applied++;
    recordInlineAppliedFile({
      path: session.change.path,
      absPath: session.change.absPath,
      originalExists: session.change.originalExists,
      originalContent: previousContent,
      appliedContent: nextContent,
    });
  }
  PendingChanges.acceptHunk(changeId, hunkId);
  PendingChanges.removeHunk(changeId, hunkId);
  session.statusBar && (session.statusBar.text = `Voltix: ${session.applied} of ${session.total} hunks applied`);
  session.onActivity?.(`${session.applied} of ${session.total} hunks applied`);
  session.refresh?.();
  if (session.change.hunks.length === 0) closeInlineHunkSession(changeId);
  return true;
}

export async function rejectInlineHunk(changeId: string, hunkId: string): Promise<void> {
  const session = sessions.get(changeId);
  if (!session) return;
  PendingChanges.rejectHunk(changeId, hunkId);
  PendingChanges.removeHunk(changeId, hunkId);
  session.statusBar && (session.statusBar.text = `Voltix: ${session.applied} of ${session.total} hunks applied`);
  session.onActivity?.(`Voltix: hunk rejected · ${session.applied} of ${session.total} hunks applied`);
  session.refresh?.();
  if (session.change.hunks.length === 0) closeInlineHunkSession(changeId);
}

export async function acceptAllInlineHunks(changeId: string): Promise<void> {
  const session = sessions.get(changeId);
  if (!session) return;
  const hunks: Hunk[] = [...session.change.hunks];
  for (const hunk of hunks) await acceptInlineHunk(changeId, hunk.id);
}

export async function rejectAllInlineHunks(changeId: string): Promise<void> {
  const session = sessions.get(changeId);
  if (!session) return;
  const hunks: Hunk[] = [...session.change.hunks];
  for (const hunk of hunks) await rejectInlineHunk(changeId, hunk.id);
}

export function cancelInlineHunkSession(changeId?: string): void {
  if (generationCancel) {
    generationCancel();
    generationCancel = undefined;
  }
  if (changeId) closeInlineHunkSession(changeId);
  else {
    for (const id of [...sessions.keys()]) closeInlineHunkSession(id);
  }
}

function closeInlineHunkSession(changeId: string): void {
  const session = sessions.get(changeId);
  if (!session) return;
  const finalText = `Voltix: ${session.applied} of ${session.total} hunks applied`;
  session.statusBar?.dispose();
  void vscode.window.setStatusBarMessage(finalText, 5000);
  session.onActivity?.(finalText);
  PendingChanges.remove(changeId);
  session.onRemoved?.(changeId);
  sessions.delete(changeId);
  void vscode.commands.executeCommand('setContext', 'voltix.inlineSessionActive', sessions.size > 0);
  void vscode.commands.executeCommand('workbench.action.closeActiveEditor');
}
