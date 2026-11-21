import * as vscode from 'vscode';
import type { PendingChange } from '../../../shared/types';
import { VoltixDiffProvider } from './diffProvider';

export class HunkCodeLensProvider implements vscode.CodeLensProvider {
  private readonly changed = new vscode.EventEmitter<void>();
  private readonly subscriptions: vscode.Disposable[] = [];
  readonly onDidChangeCodeLenses = this.changed.event;
  private readonly acceptedDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: new vscode.ThemeColor('diffEditor.insertedTextBackground'),
  });
  private readonly rejectedDecoration = vscode.window.createTextEditorDecorationType({
    opacity: '0.55',
    textDecoration: 'line-through',
  });

  constructor(
    private readonly diffProvider: VoltixDiffProvider,
    private readonly getChange: (id: string) => PendingChange | undefined
  ) {
    this.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument(() => this.refreshDecorations()),
      vscode.window.onDidChangeActiveTextEditor(() => this.refreshDecorations())
    );
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const changeId = this.diffProvider.getProposalId(document.uri);
    const change = changeId ? this.getChange(changeId) : undefined;
    if (!change) return [];
    const lenses: vscode.CodeLens[] = [];
    const remaining = change.hunks.filter(hunk => hunk.accepted === null).length;
    const firstLine = new vscode.Range(0, 0, 0, 0);
    lenses.push(new vscode.CodeLens(firstLine, {
      title: `Voltix: ${remaining} of ${change.hunks.length} hunks to review`,
      command: 'voltix.codeLensInfo',
    }));
    lenses.push(new vscode.CodeLens(firstLine, {
      title: '✓ Accept all in file',
      command: 'voltix.acceptFile',
      arguments: [change.id],
    }));
    lenses.push(new vscode.CodeLens(firstLine, {
      title: '✗ Reject all in file',
      command: 'voltix.rejectFile',
      arguments: [change.id],
    }));
    change.hunks.forEach((hunk, index) => {
      const line = Math.max(0, Math.min(document.lineCount - 1, hunk.proposedStart - 1));
      const range = new vscode.Range(line, 0, line, 0);
      const added = hunk.lines.filter(item => item.type === 'add').length;
      const removed = hunk.lines.filter(item => item.type === 'remove').length;
      const location = added > 0 && removed === 0 ? 'insert' : 'change';
      lenses.push(new vscode.CodeLens(range, {
        title: `✓ Accept hunk ${index + 1}`,
        command: 'voltix.acceptHunk',
        arguments: [change.id, hunk.id],
      }));
      lenses.push(new vscode.CodeLens(range, {
        title: `✗ Reject hunk ${index + 1}`,
        command: 'voltix.rejectHunk',
        arguments: [change.id, hunk.id],
      }));
      lenses.push(new vscode.CodeLens(range, {
        title: `${location} at line ${hunk.proposedStart}: +${added} −${removed}`,
        command: 'voltix.codeLensInfo',
      }));
    });
    return lenses;
  }

  refresh(): void {
    this.changed.fire();
    this.refreshDecorations();
  }

  dispose(): void {
    this.changed.dispose();
    this.subscriptions.forEach(subscription => subscription.dispose());
    this.acceptedDecoration.dispose();
    this.rejectedDecoration.dispose();
  }

  private refreshDecorations(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      const changeId = this.diffProvider.getProposalId(editor.document.uri);
      const change = changeId ? this.getChange(changeId) : undefined;
      if (!change) {
        editor.setDecorations(this.acceptedDecoration, []);
        editor.setDecorations(this.rejectedDecoration, []);
        continue;
      }
      const accepted: vscode.Range[] = [];
      const rejected: vscode.Range[] = [];
      change.hunks.forEach(hunk => {
        if (hunk.accepted === null) return;
        const start = Math.max(0, Math.min(editor.document.lineCount - 1, hunk.proposedStart - 1));
        const end = Math.max(start, Math.min(editor.document.lineCount - 1, start + Math.max(1, hunk.proposedCount) - 1));
        (hunk.accepted ? accepted : rejected).push(new vscode.Range(start, 0, end, editor.document.lineAt(end).text.length));
      });
      editor.setDecorations(this.acceptedDecoration, accepted);
      editor.setDecorations(this.rejectedDecoration, rejected);
    }
  }
}
