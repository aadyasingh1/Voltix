import * as vscode from 'vscode';
import type { PanelInboundMessage, PanelOutboundMessage } from '../../../shared/types';
import type { AgentSurface } from './surfaceHub';
import { buildAgentHtml } from './webviewHtml';

/** The wide editor-tab view of Voltix, used for hunk review and side-by-side comparison. */
export class AgentPanel implements AgentSurface {
  private panel: vscode.WebviewPanel;

  constructor(onMessage: (message: PanelInboundMessage, surface: AgentSurface) => void | Promise<void>) {
    this.panel = vscode.window.createWebviewPanel(
      'voltixAgent',
      'Voltix',
      vscode.ViewColumn.Active,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    this.panel.webview.onDidReceiveMessage(message => onMessage(message, this));
    this.panel.webview.html = buildAgentHtml();
  }

  onDidDispose(listener: () => void) {
    return this.panel.onDidDispose(listener);
  }

  reveal() {
    this.panel.reveal();
  }

  post(message: PanelOutboundMessage) {
    void this.panel.webview.postMessage(message);
  }
}
