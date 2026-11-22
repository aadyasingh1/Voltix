import * as vscode from 'vscode';
import type { PanelInboundMessage, PanelOutboundMessage } from '../../../shared/types';
import type { AgentSurface, SurfaceHub } from './surfaceHub';
import { buildAgentHtml } from './webviewHtml';

/** The Voltix sidebar. It renders the same page and speaks the same messages as the editor tab. */
export class AgentViewProvider implements vscode.WebviewViewProvider, AgentSurface {
  static readonly viewType = 'voltix.agentView';
  private view: vscode.WebviewView | undefined;

  constructor(
    private readonly hub: SurfaceHub,
    private readonly onMessage: (message: PanelInboundMessage, surface: AgentSurface) => void | Promise<void>
  ) {}

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    const detach = this.hub.attach(this);
    view.webview.options = { enableScripts: true };
    view.webview.onDidReceiveMessage(message => this.onMessage(message, this));
    view.onDidDispose(() => {
      detach();
      if (this.view === view) this.view = undefined;
    });
    view.webview.html = buildAgentHtml();
  }

  post(message: PanelOutboundMessage): void {
    void this.view?.webview.postMessage(message);
  }
}
