import * as vscode from 'vscode';

export class VoltixDiffProvider implements vscode.TextDocumentContentProvider {
  private readonly documents = new Map<string, string>();
  private readonly proposalIds = new Map<string, string>();
  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.documents.get(uri.toString()) ?? '';
  }
  getProposalId(uri: vscode.Uri): string | undefined {
    return this.proposalIds.get(uri.toString());
  }
  /** `extension` (for example ".py") gives the diff view the right syntax highlighting. */
  set(id: string, content: string, extension = '.txt', proposalId?: string): vscode.Uri {
    const uri = vscode.Uri.parse(`voltix:${encodeURIComponent(id)}${extension}`);
    this.documents.set(uri.toString(), content);
    if (proposalId) this.proposalIds.set(uri.toString(), proposalId);
    return uri;
  }
}
