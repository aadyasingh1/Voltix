import * as vscode from 'vscode';
import type { PanelInboundMessage, PanelOutboundMessage } from '../../../shared/types';

export class AgentPanel {
  private panel: vscode.WebviewPanel;
  private inbound?: (message: PanelInboundMessage) => void;

  constructor(extensionUri: vscode.Uri) {
    this.panel = vscode.window.createWebviewPanel(
      'voltixAgent',
      'Voltix',
      vscode.ViewColumn.Two,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    this.panel.webview.html = this.getHtml();
  }

  setInboundHandler(handler: (message: PanelInboundMessage) => void) {
    this.inbound = handler;
    this.panel.webview.onDidReceiveMessage(message => this.inbound?.(message));
  }

  onDidDispose(listener: () => void) {
    return this.panel.onDidDispose(listener);
  }

  reveal() { this.panel.reveal(vscode.ViewColumn.Two); }

  post(message: PanelOutboundMessage) {
    void this.panel.webview.postMessage(message);
  }

  private getHtml(): string {
    return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    /* Native VS Code look: every colour and font comes from the user's active theme. */
    *{box-sizing:border-box}
    :root{--tf-accent:#7c5cff;--tf-accent2:#2bb3ff;--tf-radius:8px;--tf-border:var(--vscode-widget-border,var(--vscode-panel-border,rgba(128,128,128,.35)));--tf-card:var(--vscode-sideBar-background,var(--vscode-editor-background));--tf-muted:var(--vscode-descriptionForeground)}
    body{margin:0;padding:20px 22px 32px;font-family:var(--vscode-font-family);font-size:var(--vscode-font-size,13px);line-height:1.5;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
    h1,h2,h3,p{margin-top:0}
    h1{display:flex;align-items:center;gap:10px;font-size:20px;font-weight:700;margin-bottom:16px;letter-spacing:-.01em}
    h1::before{content:"";width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,var(--tf-accent),var(--tf-accent2));box-shadow:0 2px 8px rgba(124,92,255,.45)}
    h1::after{content:"Coding agent · runs on TrueForge";font-size:11px;font-weight:500;letter-spacing:.02em;padding:2px 8px;border-radius:999px;color:var(--tf-muted);border:1px solid var(--tf-border)}
    h2{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--tf-muted)}
    h3{font-size:14px;font-weight:600}
    button{font-family:var(--vscode-font-family);font-size:12px;font-weight:500;color:var(--vscode-button-foreground);background:var(--vscode-button-background);border:1px solid transparent;border-radius:6px;padding:6px 14px;cursor:pointer;transition:background .12s,opacity .12s}
    button:hover{background:var(--vscode-button-hoverBackground)}
    button:disabled{opacity:.45;cursor:default}
    button.secondary{color:var(--vscode-button-secondaryForeground);background:var(--vscode-button-secondaryBackground)}
    button.secondary:hover{background:var(--vscode-button-secondaryHoverBackground)}
    button.danger{color:var(--vscode-errorForeground);background:transparent;border-color:var(--tf-border)}
    button.danger:hover:not(:disabled){background:var(--vscode-inputValidation-errorBackground,rgba(255,80,80,.12))}
    #submit{background:linear-gradient(135deg,var(--tf-accent),var(--tf-accent2));color:#fff;padding:6px 18px}
    #submit:hover:not(:disabled){filter:brightness(1.1)}
    button:focus-visible,textarea:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:2px}
    textarea{display:block;width:100%;min-height:84px;resize:vertical;margin:0 0 10px;padding:10px 12px;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--tf-border));border-radius:var(--tf-radius);font-family:var(--vscode-font-family);font-size:13px}
    textarea:focus{border-color:var(--vscode-focusBorder);outline:none}
    textarea::placeholder{color:var(--vscode-input-placeholderForeground)}
    label{display:block;margin-bottom:6px;font-weight:600;font-size:12px;color:var(--tf-muted)}
    code,pre,.diff-row,.unified-row,.activity-preview,.receipt-item pre,.file-nav,.hunk-review-title{font-family:var(--vscode-editor-font-family)}
    .toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
    #status{min-height:20px;margin:8px 0;color:var(--tf-muted);font-size:12px}
    .error-banner,.result-banner{margin:10px 0;padding:10px 12px;border:1px solid var(--tf-border);border-left:3px solid var(--vscode-testing-iconPassed,#3fb950);border-radius:var(--tf-radius);background:var(--tf-card)}
    .error-banner{border-left-color:var(--vscode-errorForeground)}
    .result-banner.success{border-left-color:var(--vscode-testing-iconPassed,#3fb950)}
    .result-banner.failure{border-left-color:var(--vscode-errorForeground)}
    .banner-heading{font-weight:600;margin-bottom:4px}
    .banner-list{margin:6px 0 0;padding-left:20px}
    #output{margin:8px 0 16px;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px 14px;border:1px solid var(--tf-border);border-left:3px solid var(--tf-accent);border-radius:var(--tf-radius);background:var(--tf-card)}
    .panel-section{margin:14px 0;border:1px solid var(--tf-border);border-radius:var(--tf-radius);background:var(--tf-card);overflow:hidden}
    .panel-section>summary{cursor:pointer;padding:10px 12px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--tf-muted)}
    .panel-section>summary:hover{color:var(--vscode-foreground)}
    .receipt-body{padding:0 12px 12px}
    .receipt-summary{color:var(--tf-muted);margin:0 0 8px}
    .receipt-item{border-top:1px solid var(--tf-border);padding:8px 0}
    .receipt-item summary{cursor:pointer;overflow-wrap:anywhere}
    .receipt-item pre{max-height:240px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:8px 10px;background:var(--vscode-textCodeBlock-background,var(--vscode-editor-background));border:1px solid var(--tf-border);border-radius:6px;font-size:12px;line-height:1.5}
    #activity-list{margin:0;padding:0;list-style:none;max-height:360px;overflow:auto}
    .activity-item{position:relative;padding:9px 12px 9px 28px;border-top:1px solid var(--tf-border)}
    .activity-item::before{content:"";position:absolute;left:12px;top:15px;width:7px;height:7px;border-radius:50%;background:var(--tf-accent)}
    .activity-title{font-weight:600;font-family:var(--vscode-editor-font-family);color:var(--vscode-textLink-foreground)}
    .activity-status,.activity-preview{color:var(--tf-muted);margin:3px 0 0}
    .activity-preview{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11.5px;max-height:120px;overflow:hidden;-webkit-mask-image:linear-gradient(#000 75%,transparent)}
    #activity-heading{padding:10px 12px;margin:0}
    .review-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:20px 0 10px}
    .review-heading h2{margin:0}
    #review-counts{color:var(--tf-muted);font-size:12px}
    .review-actions{display:flex;gap:8px}
    .review-layout{display:grid;grid-template-columns:minmax(150px,240px) minmax(0,1fr);gap:12px;align-items:start}
    #file-list{display:flex;flex-direction:column;gap:6px}
    .file-nav{width:100%;text-align:left;color:var(--vscode-foreground);background:var(--tf-card);border:1px solid var(--tf-border);border-radius:6px;overflow-wrap:anywhere;font-size:12px}
    .file-nav:hover{background:var(--vscode-list-hoverBackground)}
    .file-nav[aria-current="true"]{background:var(--vscode-list-activeSelectionBackground);color:var(--vscode-list-activeSelectionForeground,var(--vscode-foreground));border-color:var(--vscode-focusBorder);box-shadow:inset 3px 0 0 var(--tf-accent)}
    .file-nav-path,.file-nav-state{display:block}
    .file-nav-state{margin-top:4px;color:var(--tf-muted);font-size:11px}
    #review-detail{min-width:0;min-height:160px;border:1px solid var(--tf-border);border-radius:var(--tf-radius);overflow:hidden;background:var(--vscode-editor-background)}
    .review-empty{padding:18px;color:var(--tf-muted)}
    .review-header{position:sticky;top:0;z-index:2;padding:12px 14px;background:var(--tf-card);border-bottom:1px solid var(--tf-border)}
    .review-header h3{margin:0 0 5px;overflow-wrap:anywhere;font-family:var(--vscode-editor-font-family)}
    .review-reason{margin:0 0 8px;color:var(--tf-muted);white-space:pre-wrap;overflow-wrap:anywhere}
    .review-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:var(--tf-muted);margin-bottom:8px}
    .state-badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:600;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground)}
    .decision-note{margin:8px 0 0;color:var(--tf-muted)}
    .diff-mode{margin-left:auto}
    .diff-labels,.diff-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
    .diff-labels{background:var(--tf-card);border-bottom:1px solid var(--tf-border);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--tf-muted)}
    .diff-labels span{padding:6px 8px}
    .diff-labels span+span,.diff-cell+.diff-cell{border-left:1px solid var(--tf-border)}
    .diff-row,.unified-row{min-width:0;font-size:12px;line-height:1.6}
    .hunk-review-control{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:6px 10px;background:var(--tf-card);border-top:1px solid var(--tf-border)}
    .hunk-review-title{flex:1 1 220px;color:var(--tf-muted);font-size:12px}
    .hunk-review-state{color:var(--vscode-textLink-foreground)}
    .diff-cell{display:flex;min-width:0;white-space:pre}
    .line-number{flex:0 0 4em;padding:0 6px;text-align:right;color:var(--vscode-editorLineNumber-foreground);user-select:none}
    .line-content{min-width:0;overflow-x:auto;padding:0 8px}
    .diff-add .diff-cell,.unified-row.diff-add{background:var(--vscode-diffEditor-insertedLineBackground,rgba(46,160,67,.18));box-shadow:inset 2px 0 0 var(--vscode-testing-iconPassed,#3fb950)}
    .diff-remove .diff-cell,.unified-row.diff-remove{background:var(--vscode-diffEditor-removedLineBackground,rgba(248,81,73,.18));box-shadow:inset 2px 0 0 var(--vscode-errorForeground,#f85149)}
    .unified-row{display:flex;white-space:pre}
    .unified-prefix{flex:0 0 1.5em;text-align:center;color:var(--tf-muted)}
    .unified-number{flex:0 0 5em;color:var(--vscode-editorLineNumber-foreground);text-align:right;padding-right:6px}
    .unified-content{min-width:0;overflow-x:auto;padding:0 8px}
    .diff-row+.diff-row,.unified-row+.unified-row{border-top:1px solid transparent}
    .meta-row{display:flex;align-items:center;gap:8px;min-height:22px;margin:4px 0 2px}
    .model-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:2px 10px;border-radius:999px;border:1px solid var(--tf-border);color:var(--tf-muted);font-family:var(--vscode-editor-font-family)}
    .model-badge::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--vscode-testing-iconPassed,#3fb950)}
    .model-badge.fallback{color:var(--vscode-editorWarning-foreground,#cca700);border-color:var(--vscode-editorWarning-foreground,#cca700)}
    .model-badge.fallback::before{background:var(--vscode-editorWarning-foreground,#cca700)}
    .card{margin:12px 0;border:1px solid var(--tf-border);border-radius:var(--tf-radius);background:var(--tf-card);overflow:hidden}
    .card-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--tf-border)}
    .card-title{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--tf-muted);margin-right:auto}
    .pill{display:inline-flex;align-items:center;gap:5px;padding:1px 9px;border-radius:999px;font-size:11px;font-weight:600;border:1px solid var(--tf-border);white-space:nowrap}
    .pill.ok{color:var(--vscode-testing-iconPassed,#3fb950);border-color:currentColor}
    .pill.bad{color:var(--vscode-errorForeground,#f85149);border-color:currentColor}
    .pill.warn{color:var(--vscode-editorWarning-foreground,#cca700);border-color:currentColor}
    .pill.info{color:var(--vscode-textLink-foreground);border-color:currentColor}
    .pill.muted{color:var(--tf-muted)}
    .verify-card{border-left:3px solid var(--tf-border)}
    .verify-card.passed{border-left-color:var(--vscode-testing-iconPassed,#3fb950)}
    .verify-card.failed{border-left-color:var(--vscode-errorForeground,#f85149)}
    .verify-card.running,.verify-card.fixing{border-left-color:var(--tf-accent)}
    .verify-steps{list-style:none;margin:0;padding:6px 12px 10px}
    .verify-step{display:grid;grid-template-columns:22px 1fr;gap:6px;padding:5px 0;align-items:start}
    .verify-step+.verify-step{border-top:1px dashed var(--tf-border)}
    .step-icon{font-weight:700;text-align:center}
    .step-icon.ok{color:var(--vscode-testing-iconPassed,#3fb950)}
    .step-icon.bad{color:var(--vscode-errorForeground,#f85149)}
    .step-icon.run{color:var(--tf-accent);animation:tfspin 1s linear infinite;display:inline-block}
    .step-main{min-width:0}
    .step-text{font-weight:500}
    .step-cmd{display:block;margin-top:2px;font-family:var(--vscode-editor-font-family);font-size:11.5px;color:var(--tf-muted);overflow-wrap:anywhere}
    .step-output{margin:6px 0 0;max-height:160px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:8px 10px;font-size:11.5px;background:var(--vscode-textCodeBlock-background,var(--vscode-editor-background));border:1px solid var(--tf-border);border-radius:6px}
    @keyframes tfspin{to{transform:rotate(360deg)}}
    .passport-stats{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 0}
    .passport-table{width:100%;border-collapse:collapse;margin:8px 0 4px;font-size:12px}
    .passport-table th{text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--tf-muted);padding:6px 12px;border-bottom:1px solid var(--tf-border)}
    .passport-table td{padding:7px 12px;border-bottom:1px solid var(--tf-border);vertical-align:top}
    .passport-table tr:last-child td{border-bottom:none}
    .passport-path{font-family:var(--vscode-editor-font-family);overflow-wrap:anywhere}
    .passport-notes{color:var(--tf-muted)}
    .passport-flag{display:block;margin-top:3px}
    .passport-flag.high{color:var(--vscode-errorForeground,#f85149)}
    .passport-flag.medium{color:var(--vscode-editorWarning-foreground,#cca700)}
    .num-add{color:var(--vscode-testing-iconPassed,#3fb950)}
    .num-del{color:var(--vscode-errorForeground,#f85149)}
    #probe-row{margin:0 0 12px;padding:10px 12px;border:1px solid var(--tf-border);border-radius:var(--tf-radius);background:var(--tf-card)}
    #probe-row[hidden]{display:none}
    #probe{display:block;width:100%;margin:0 0 6px;padding:6px 10px;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--tf-border));border-radius:6px;font-family:var(--vscode-editor-font-family);font-size:12px}
    #probe:focus{border-color:var(--vscode-focusBorder);outline:none}
    .field-hint{margin:0 0 10px;color:var(--tf-muted);font-size:11.5px}
    #probe-row .toolbar{margin-bottom:0}
    .card-note{margin:0;padding:8px 12px;color:var(--tf-muted);font-size:12px;border-bottom:1px solid var(--tf-border)}
    .future-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:10px 12px}
    .future-card{min-width:0;padding:10px 12px;border:1px solid var(--tf-border);border-radius:6px;background:var(--vscode-editor-background)}
    .future-card.chosen{border-color:var(--tf-accent);box-shadow:inset 3px 0 0 var(--tf-accent)}
    .future-title{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:6px;font-weight:600}
    .future-letter{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;font-size:11px;font-weight:700;color:var(--vscode-badge-foreground);background:var(--vscode-badge-background)}
    .future-text{margin:0 0 6px;overflow-wrap:anywhere}
    .future-tradeoff{margin:0 0 8px;color:var(--tf-muted);font-size:12px;overflow-wrap:anywhere}
    .future-label{display:block;margin-top:4px;color:var(--tf-muted);font-size:11.5px;overflow-wrap:anywhere}
    .future-error{display:block;margin-top:4px;color:var(--vscode-errorForeground);font-size:11.5px;overflow-wrap:anywhere}
    .compare-scroll{overflow-x:auto}
    .compare-table{width:100%;border-collapse:collapse;font-size:12px}
    .compare-table th,.compare-table td{padding:7px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--tf-border);overflow-wrap:anywhere}
    .compare-table th{font-size:11px;font-weight:600;color:var(--tf-muted)}
    .compare-table tr:last-child td{border-bottom:none}
    .compare-table td.better{font-weight:600;color:var(--vscode-testing-iconPassed,#3fb950);background:var(--vscode-diffEditor-insertedLineBackground,rgba(46,160,67,.12))}
    .compare-actions{display:flex;flex-wrap:wrap;gap:6px}
    .probe-output{margin:0;padding:8px 12px;max-height:180px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-family:var(--vscode-editor-font-family);font-size:11.5px;border-top:1px solid var(--tf-border)}
    .future-files{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px}
    .future-files .file-nav{width:auto}
    .future-diff{border-top:1px solid var(--tf-border);overflow:auto;max-height:520px}
    .future-diff .review-header{position:static}
    .regret-card{border-left:3px solid var(--vscode-editorWarning-foreground,#cca700)}
    .regret-heading{padding:10px 12px 0;font-weight:600}
    .regret-list{margin:4px 0 0;padding:0 12px 4px 30px}
    .regret-list li{overflow-wrap:anywhere}
    @media(max-width:640px){.review-layout{grid-template-columns:1fr}.review-heading{align-items:flex-start;flex-wrap:wrap}.future-grid{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){.step-icon.run{animation:none}}
  </style>
</head>
<body>
  <h1>Voltix</h1>
  <form id="prompt-form">
    <label for="input">Describe a task</label>
    <textarea id="input" placeholder="Describe a task..." rows="3"></textarea>
    <div class="toolbar">
      <button id="submit" type="submit">Send</button>
      <button id="explore" class="secondary" type="button" aria-expanded="false" aria-controls="probe-row">Explore futures</button>
      <button id="cancel" class="secondary" type="button">Cancel</button>
      <button id="apply" type="button" disabled>Apply Accepted</button>
      <button id="discard" class="danger" type="button">Discard All</button>
    </div>
    <div id="probe-row" hidden>
      <label for="probe">Probe command (optional)</label>
      <input id="probe" type="text" spellcheck="false" autocomplete="off" placeholder="flask --app /tmp/hello.py config">
      <p class="field-hint">Runs in each future's sandbox. Allowed: python, flask, node, pytest, npm test, npm run. No pipes or chaining.</p>
      <div class="toolbar">
        <button id="explore-start" type="button">Start exploring</button>
        <button id="explore-back" class="secondary" type="button">Back</button>
      </div>
    </div>
  </form>
  <div class="meta-row"><span id="model-badge" class="model-badge" hidden></span></div>
  <div id="status" role="status" aria-live="polite"></div>
  <div id="error-area" aria-live="assertive"></div>
  <div id="result-area" aria-live="polite"></div>
  <div id="futures-area"></div>
  <details id="receipt" class="panel-section">
    <summary>Context Receipt <span id="receipt-count"></span></summary>
    <div id="receipt-body" class="receipt-body"><p class="receipt-summary">No context receipt for this request yet.</p></div>
  </details>
  <section class="panel-section" aria-labelledby="activity-heading">
    <h2 id="activity-heading">Agent activity</h2>
    <ol id="activity-list" aria-live="polite"><li class="activity-item">Observed tool and turn events will appear here.</li></ol>
  </section>
  <section aria-labelledby="response-heading">
    <h2 id="response-heading">Agent response</h2>
    <div id="output" aria-live="polite">The agent response will appear here.</div>
  </section>
  <section aria-labelledby="review-title">
    <div class="review-heading">
      <h2 id="review-title">Proposed files</h2>
      <span id="review-counts">No files to review</span>
      <div class="review-actions" aria-label="Review all files">
        <button id="accept-all" class="secondary" type="button" disabled>Accept All</button>
        <button id="reject-all" class="danger" type="button" disabled>Reject All</button>
      </div>
    </div>
    <div id="verify-area"></div>
    <div id="passport-area"></div>
    <div class="review-layout">
      <nav id="file-list" aria-label="Proposed files"></nav>
      <section id="review-detail" aria-live="polite"><div class="review-empty">Proposed changes will appear here.</div></section>
    </div>
  </section>
  <script>
    const vscode = acquireVsCodeApi();
    const state = {
      changes: [],
      selectedId: null,
      decisions: new Map(),
      hunkDecisions: new Map(),
      outcomes: new Map(),
      activities: [],
      diffMode: 'side-by-side',
      busy: false,
      applying: false,
      lastSubmittedText: ''
    };
    const input = document.getElementById('input');
    const output = document.getElementById('output');
    const fileList = document.getElementById('file-list');
    const reviewDetail = document.getElementById('review-detail');
    const reviewCounts = document.getElementById('review-counts');
    const status = document.getElementById('status');
    const errorArea = document.getElementById('error-area');
    const resultArea = document.getElementById('result-area');
    const receiptBody = document.getElementById('receipt-body');
    const receiptCount = document.getElementById('receipt-count');
    const activityList = document.getElementById('activity-list');
    const submitButton = document.getElementById('submit');
    const cancelButton = document.getElementById('cancel');
    const applyButton = document.getElementById('apply');
    const acceptAllButton = document.getElementById('accept-all');
    const rejectAllButton = document.getElementById('reject-all');
    const discardButton = document.getElementById('discard');
    const modelBadge = document.getElementById('model-badge');
    const verifyArea = document.getElementById('verify-area');
    const passportArea = document.getElementById('passport-area');
    const exploreButton = document.getElementById('explore');
    const exploreStartButton = document.getElementById('explore-start');
    const exploreBackButton = document.getElementById('explore-back');
    const probeRow = document.getElementById('probe-row');
    const probeInput = document.getElementById('probe');
    const futuresArea = document.getElementById('futures-area');
    state.verifyEvents = [];
    state.passport = null;
    state.futures = emptyFutures();

    function emptyFutures() {
      return { strategies: [], usedFallback: false, phases: {}, results: {}, rows: null, viewing: null, viewFileIndex: 0, chosen: null, regret: null };
    }

    function regretList(card, title, items) {
      card.appendChild(makeElement('div', 'regret-heading', title));
      const list = makeElement('ul', 'regret-list');
      (items || []).forEach(item => list.appendChild(makeElement('li', '', item)));
      card.appendChild(list);
    }

    function renderRegret() {
      const regret = state.futures.regret;
      const card = makeElement('section', 'card regret-card');
      const head = makeElement('div', 'card-head');
      head.appendChild(makeElement('span', 'card-title', 'Regret check · Future ' + regret.futureId));
      head.appendChild(makeElement('span', 'pill warn', 'Hypothetical - based on the evidence above'));
      card.appendChild(head);
      if (regret.source === 'evidence') {
        card.appendChild(makeElement('p', 'card-note', 'The model gave no usable answer, so these points come directly from the measured evidence.'));
      }
      regretList(card, 'What you gain', regret.gain);
      regretList(card, 'What you give up', regret.giveUp);
      regretList(card, 'You would regret this if…', regret.regretIf);
      return card;
    }

    function setFuturesMode(open) {
      probeRow.hidden = !open;
      exploreButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) probeInput.focus();
    }

    function phaseChip(phase) {
      const names = { planning: 'Waiting', implementing: 'Implementing', verifying: 'Verifying', fixing: 'Fixing', probing: 'Probing', done: 'Done', failed: 'Failed' };
      const cls = phase === 'done' ? 'ok' : phase === 'failed' ? 'bad' : phase === 'planning' ? 'muted' : 'info';
      return makeElement('span', 'pill ' + cls, names[phase] || 'Waiting');
    }

    function renderStrategy(strategy) {
      const futures = state.futures;
      const isChosen = futures.chosen && futures.chosen.futureId === strategy.id;
      const card = makeElement('article', 'future-card' + (isChosen ? ' chosen' : ''));
      const title = makeElement('div', 'future-title');
      title.appendChild(makeElement('span', 'future-letter', strategy.id));
      title.appendChild(makeElement('span', '', strategy.title));
      card.appendChild(title);
      card.appendChild(makeElement('p', 'future-text', strategy.approach));
      if (strategy.tradeoff) card.appendChild(makeElement('p', 'future-tradeoff', 'Trade-off: ' + strategy.tradeoff));
      const progress = futures.phases[strategy.id] || { phase: 'planning', label: 'Waiting' };
      card.appendChild(phaseChip(progress.phase));
      if (progress.phase === 'failed') card.appendChild(makeElement('span', 'future-error', progress.label));
      else if (progress.phase !== 'done' && progress.label) card.appendChild(makeElement('span', 'future-label', progress.label));
      return card;
    }

    function futureActions(id) {
      const futures = state.futures;
      const result = futures.results[id];
      const usable = Boolean(result && result.evidence.status === 'completed' && result.changes.length);
      const actions = makeElement('div', 'compare-actions');
      const view = makeElement('button', 'secondary', futures.viewing === id ? 'Hide diff' : 'View diff');
      view.type = 'button';
      view.dataset.action = 'view-future';
      view.dataset.futureId = id;
      view.disabled = !(result && result.changes.length);
      actions.appendChild(view);
      if (futures.chosen) {
        if (futures.chosen.futureId === id) actions.appendChild(makeElement('span', 'pill ok', '✓ Chosen'));
      } else {
        const choose = makeElement('button', '', 'Choose this future');
        choose.type = 'button';
        choose.dataset.action = 'choose-future';
        choose.dataset.futureId = id;
        choose.disabled = state.busy || !usable;
        actions.appendChild(choose);
      }
      return actions;
    }

    function renderComparison() {
      const futures = state.futures;
      const card = makeElement('section', 'card');
      const head = makeElement('div', 'card-head');
      head.appendChild(makeElement('span', 'card-title', 'Compare evidence'));
      head.appendChild(makeElement('span', 'pill muted', '✓ marks the better value'));
      card.appendChild(head);
      const scroll = makeElement('div', 'compare-scroll');
      const table = makeElement('table', 'compare-table');
      const headRow = makeElement('tr');
      ['', 'Future A', 'Future B'].forEach(label => headRow.appendChild(makeElement('th', '', label)));
      table.appendChild(headRow);
      futures.rows.forEach(row => {
        const tr = makeElement('tr');
        tr.appendChild(makeElement('th', '', row.label));
        tr.appendChild(makeElement('td', row.better === 'A' ? 'better' : '', (row.better === 'A' ? '✓ ' : '') + row.a));
        tr.appendChild(makeElement('td', row.better === 'B' ? 'better' : '', (row.better === 'B' ? '✓ ' : '') + row.b));
        table.appendChild(tr);
      });
      const actionRow = makeElement('tr');
      actionRow.appendChild(makeElement('th', '', ''));
      ['A', 'B'].forEach(id => {
        const cell = makeElement('td');
        cell.appendChild(futureActions(id));
        actionRow.appendChild(cell);
      });
      table.appendChild(actionRow);
      scroll.appendChild(table);
      card.appendChild(scroll);
      ['A', 'B'].forEach(id => {
        const result = futures.results[id];
        if (!result || !result.evidence.probe) return;
        const details = makeElement('details');
        details.appendChild(makeElement('summary', 'card-note', 'Future ' + id + ' probe output: ' + result.evidence.probe.command));
        details.appendChild(makeElement('pre', 'probe-output', result.evidence.probe.output || '(no output)'));
        card.appendChild(details);
      });
      return card;
    }

    function renderFutureDiff() {
      const futures = state.futures;
      const result = futures.results[futures.viewing];
      if (!result || !result.changes.length) return null;
      const card = makeElement('section', 'card');
      const head = makeElement('div', 'card-head');
      head.appendChild(makeElement('span', 'card-title', 'Future ' + futures.viewing + ' diff'));
      head.appendChild(makeElement('span', 'pill muted', 'Read-only'));
      card.appendChild(head);
      const files = makeElement('div', 'future-files');
      const index = Math.min(futures.viewFileIndex, result.changes.length - 1);
      result.changes.forEach((change, fileIndex) => {
        const button = makeElement('button', 'file-nav', change.path);
        button.type = 'button';
        button.dataset.action = 'future-file';
        button.dataset.index = String(fileIndex);
        button.setAttribute('aria-current', fileIndex === index ? 'true' : 'false');
        files.appendChild(button);
      });
      card.appendChild(files);
      const change = result.changes[index];
      const container = makeElement('div', 'future-diff');
      const header = makeElement('div', 'review-header');
      header.appendChild(makeElement('p', 'review-reason', change.reason || 'No change summary provided.'));
      header.appendChild(makeElement('div', 'review-meta'));
      container.appendChild(header);
      renderDiff(change, container, true);
      card.appendChild(container);
      return card;
    }

    function renderFutures() {
      clear(futuresArea);
      const futures = state.futures;
      if (!futures.strategies.length) return;
      const section = makeElement('section', 'card');
      const head = makeElement('div', 'card-head');
      head.appendChild(makeElement('span', 'card-title', 'Parallel futures'));
      if (futures.chosen) {
        head.appendChild(makeElement('span', 'pill ok', 'Chose Future ' + futures.chosen.futureId + ' over ' + futures.chosen.otherId));
      }
      section.appendChild(head);
      if (futures.usedFallback) {
        section.appendChild(makeElement('p', 'card-note', 'The model did not return a usable plan, so Voltix used two default strategies.'));
      }
      const grid = makeElement('div', 'future-grid');
      futures.strategies.forEach(strategy => grid.appendChild(renderStrategy(strategy)));
      section.appendChild(grid);
      futuresArea.appendChild(section);
      if (futures.rows) futuresArea.appendChild(renderComparison());
      if (futures.regret) futuresArea.appendChild(renderRegret());
      if (futures.viewing) {
        const diff = renderFutureDiff();
        if (diff) futuresArea.appendChild(diff);
      }
    }

    function startExplore() {
      if (state.busy) return;
      const text = input.value;
      if (!text.trim()) {
        showError('Describe a task before exploring futures.', true);
        input.focus();
        return;
      }
      state.lastSubmittedText = text;
      clear(errorArea);
      clear(resultArea);
      state.activities = [];
      renderActivity();
      state.futures = emptyFutures();
      renderFutures();
      setFuturesMode(false);
      setBusy(true);
      status.textContent = 'Planning two different strategies...';
      vscode.postMessage({ type: 'explore_futures', text, probeCommand: probeInput.value });
      input.value = '';
    }

    function renderVerification() {
      clear(verifyArea);
      const events = state.verifyEvents;
      if (!events.length) return;
      const last = events[events.length - 1];
      const card = makeElement('section', 'card verify-card ' + last.phase);
      const head = makeElement('div', 'card-head');
      head.appendChild(makeElement('span', 'card-title', 'Verify before apply'));
      const pillClass = last.phase === 'passed' ? 'ok' : last.phase === 'failed' ? 'bad' : last.phase === 'skipped' ? 'muted' : 'info';
      const pillText = last.phase === 'passed' ? '✓ Verified in sandbox' : last.phase === 'failed' ? '✗ Tests failing' :
        last.phase === 'skipped' ? 'Not verified' : last.phase === 'fixing' ? 'Agent fixing' : 'Running tests';
      head.appendChild(makeElement('span', 'pill ' + pillClass, pillText));
      const fixes = events.filter(item => item.phase === 'fixing').length;
      if (fixes) head.appendChild(makeElement('span', 'pill muted', fixes + ' automatic fix round' + (fixes > 1 ? 's' : '')));
      card.appendChild(head);
      const steps = makeElement('ol', 'verify-steps');
      events.forEach((item, index) => {
        if (item.phase === 'running' && index < events.length - 1) return;
        const step = makeElement('li', 'verify-step');
        const icon = item.phase === 'passed' ? ['ok', '✓'] : item.phase === 'failed' ? ['bad', '✗'] :
          item.phase === 'fixing' ? ['run', '↻'] : item.phase === 'running' ? ['run', '◌'] : ['', '–'];
        step.appendChild(makeElement('span', 'step-icon ' + icon[0], icon[1]));
        const main = makeElement('div', 'step-main');
        const who = item.source === 'agent' ? 'Agent ran tests' : item.phase === 'fixing' ? 'Voltix sent failures back' : 'Voltix ran tests';
        main.appendChild(makeElement('span', 'step-text', who + ': ' + (item.summary || '')));
        if (item.command && item.phase !== 'fixing') {
          main.appendChild(makeElement('span', 'step-cmd', '$ ' + item.command + (item.durationMs ? '  ·  ' + (item.durationMs / 1000).toFixed(1) + 's' : '')));
        }
        if (item.phase === 'failed' && item.output && index === events.length - 1) {
          const details = makeElement('details');
          details.appendChild(makeElement('summary', 'step-cmd', 'Show test output'));
          details.appendChild(makeElement('pre', 'step-output', item.output));
          main.appendChild(details);
        }
        step.appendChild(main);
        steps.appendChild(step);
      });
      card.appendChild(steps);
      verifyArea.appendChild(card);
    }

    function riskPill(risk) {
      const cls = risk === 'high' ? 'bad' : risk === 'medium' ? 'warn' : 'ok';
      return makeElement('span', 'pill ' + cls, (risk || 'low').toUpperCase() + ' RISK');
    }

    function renderPassport() {
      clear(passportArea);
      const passport = state.passport;
      if (!passport || !passport.files || !passport.files.length) return;
      const card = makeElement('section', 'card');
      const head = makeElement('div', 'card-head');
      head.appendChild(makeElement('span', 'card-title', 'Change passport'));
      head.appendChild(riskPill(passport.risk));
      const copy = makeElement('button', 'secondary', 'Copy as Markdown');
      copy.type = 'button';
      copy.dataset.action = 'copy-passport';
      head.appendChild(copy);
      card.appendChild(head);
      const stats = makeElement('div', 'passport-stats');
      const totals = passport.totals || {};
      stats.appendChild(makeElement('span', 'pill muted', totals.files + ' file' + (totals.files === 1 ? '' : 's')));
      const delta = makeElement('span', 'pill muted');
      delta.appendChild(makeElement('span', 'num-add', '+' + totals.added));
      delta.appendChild(document.createTextNode(' / '));
      delta.appendChild(makeElement('span', 'num-del', '−' + totals.removed));
      stats.appendChild(delta);
      stats.appendChild(makeElement('span', 'pill muted', 'Blast radius: ' + totals.dependents + ' dependent file' + (totals.dependents === 1 ? '' : 's')));
      stats.appendChild(makeElement('span', 'pill ' + (passport.testsTouched ? 'ok' : 'warn'), passport.testsTouched ? 'Tests included' : 'No tests changed'));
      if (passport.verification) {
        stats.appendChild(makeElement('span', 'pill ' + (passport.verification.passed ? 'ok' : 'bad'),
          passport.verification.passed ? '✓ ' + passport.verification.summary : '✗ ' + passport.verification.summary));
      }
      card.appendChild(stats);
      const table = makeElement('table', 'passport-table');
      const headRow = makeElement('tr');
      ['File', 'Change', 'Risk', 'Notes'].forEach(label => headRow.appendChild(makeElement('th', '', label)));
      table.appendChild(headRow);
      passport.files.forEach(file => {
        const row = makeElement('tr');
        row.appendChild(makeElement('td', 'passport-path', file.path));
        const change = makeElement('td');
        change.appendChild(makeElement('span', 'num-add', '+' + file.added));
        change.appendChild(document.createTextNode(' '));
        change.appendChild(makeElement('span', 'num-del', '−' + file.removed));
        row.appendChild(change);
        const riskCell = makeElement('td');
        riskCell.appendChild(riskPill(file.risk));
        row.appendChild(riskCell);
        const notes = makeElement('td', 'passport-notes');
        const parts = [];
        if (file.isNew) parts.push('new file');
        if (file.isTest) parts.push('test');
        if (file.symbols && file.symbols.length) parts.push('defines ' + file.symbols.join(', '));
        if (file.dependents && file.dependents.length) parts.push('imported by ' + file.dependents.length + ' file' + (file.dependents.length === 1 ? '' : 's'));
        notes.appendChild(document.createTextNode(parts.join(' · ') || '—'));
        (file.flags || []).forEach(flag => notes.appendChild(makeElement('span', 'passport-flag ' + flag.level, '⚠ ' + flag.message)));
        row.appendChild(notes);
        table.appendChild(row);
      });
      card.appendChild(table);
      passportArea.appendChild(card);
    }

    function makeElement(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined && text !== null) element.textContent = String(text);
      return element;
    }

    function clear(element) {
      while (element.firstChild) element.removeChild(element.firstChild);
    }

    function renderActivity() {
      clear(activityList);
      if (state.activities.length === 0) {
        activityList.appendChild(makeElement('li', 'activity-item', 'No tool or turn events have been observed yet.'));
        return;
      }
      state.activities.forEach(activity => {
        const item = makeElement('li', 'activity-item');
        item.appendChild(makeElement('div', 'activity-title', activity.name));
        item.appendChild(makeElement('p', 'activity-status', activity.status));
        if (activity.argsPreview) {
          item.appendChild(makeElement('pre', 'activity-preview', 'Arguments: ' + activity.argsPreview));
        }
        if (activity.resultPreview) {
          item.appendChild(makeElement('pre', 'activity-preview', 'Result preview: ' + activity.resultPreview));
        }
        activityList.appendChild(item);
      });
    }

    function updateActivity(activity) {
      const existing = state.activities.find(item => item.id === activity.id);
      if (existing) Object.assign(existing, activity);
      else state.activities.push(activity);
      renderActivity();
    }

    function setBusy(busy) {
      state.busy = busy;
      submitButton.disabled = busy;
      exploreButton.disabled = busy;
      exploreStartButton.disabled = busy;
      cancelButton.disabled = !busy;
      if (busy) status.textContent = 'Request in progress...';
      updateReviewSummary();
      renderFutures();
    }

    function changeState(change) {
      const outcome = state.outcomes.get(change.id);
      if (outcome) return outcome;
      const decision = state.decisions.get(change.id);
      if (decision === 'accept') return 'Acceptance requested locally; application is not confirmed';
      if (decision === 'reject') return 'Rejection requested locally; not applied';
      const acceptedHunks = change.hunks.filter(hunk => state.hunkDecisions.get(hunk.id) === 'accept').length;
      const rejectedHunks = change.hunks.filter(hunk => state.hunkDecisions.get(hunk.id) === 'reject').length;
      if (acceptedHunks || rejectedHunks) {
        return acceptedHunks + ' hunk(s) accepted and ' + rejectedHunks +
          ' rejected locally; application is not confirmed';
      }
      return 'Not reviewed';
    }

    function updateReviewSummary() {
      const counts = { pending: 0, accepted: 0, rejected: 0, acceptedHunks: 0, rejectedHunks: 0, applied: 0, restored: 0, unchanged: 0, conflict: 0, failed: 0, manual: 0, ambiguous: 0 };
      state.changes.forEach(change => {
        const outcome = state.outcomes.get(change.id) || '';
        const decision = state.decisions.get(change.id);
        if (outcome === 'Applied') counts.applied++;
        else if (outcome === 'Restored') counts.restored++;
        else if (outcome === 'Unchanged') counts.unchanged++;
        else if (outcome === 'Conflict') counts.conflict++;
        else if (outcome === 'Failed') counts.failed++;
        else if (outcome === 'Manual recovery required') counts.manual++;
        else if (outcome === 'Ambiguous') counts.ambiguous++;
        else if (decision === 'accept') counts.accepted++;
        else if (decision === 'reject') counts.rejected++;
        else {
          const acceptedHunks = change.hunks.filter(hunk => state.hunkDecisions.get(hunk.id) === 'accept').length;
          const rejectedHunks = change.hunks.filter(hunk => state.hunkDecisions.get(hunk.id) === 'reject').length;
          counts.acceptedHunks += acceptedHunks;
          counts.rejectedHunks += rejectedHunks;
          if (!acceptedHunks && !rejectedHunks) counts.pending++;
        }
      });
      if (state.changes.length === 0) {
        reviewCounts.textContent = 'No files to review';
      } else {
        reviewCounts.textContent = state.changes.length + ' file(s) | ' +
          counts.pending + ' unreviewed | ' + counts.accepted + ' accept requested | ' +
          counts.rejected + ' reject requested | ' + counts.applied + ' applied' +
          (counts.acceptedHunks ? ' | ' + counts.acceptedHunks + ' hunk(s) accept requested' : '') +
          (counts.rejectedHunks ? ' | ' + counts.rejectedHunks + ' hunk(s) reject requested' : '') +
          (counts.restored ? ' | ' + counts.restored + ' restored' : '') +
          (counts.unchanged ? ' | ' + counts.unchanged + ' unchanged' : '') +
          (counts.conflict ? ' | ' + counts.conflict + ' conflict(s)' : '') +
          (counts.failed ? ' | ' + counts.failed + ' failed' : '') +
          (counts.manual ? ' | ' + counts.manual + ' need recovery' : '') +
          (counts.ambiguous ? ' | ' + counts.ambiguous + ' ambiguous' : '');
      }
      const accepted = state.changes.some(change =>
        (state.decisions.get(change.id) === 'accept' ||
          change.hunks.some(hunk => state.hunkDecisions.get(hunk.id) === 'accept')) &&
        !['Applied', 'Restored', 'Manual recovery required', 'Ambiguous'].includes(state.outcomes.get(change.id) || '')
      );
      applyButton.disabled = state.applying || !accepted;
      acceptAllButton.disabled = state.applying || state.changes.length === 0;
      rejectAllButton.disabled = state.applying || state.changes.length === 0;
      discardButton.disabled = state.applying;
      renderFileList();
    }

    function renderFileList() {
      clear(fileList);
      if (state.changes.length === 0) {
        fileList.appendChild(makeElement('p', 'review-empty', 'No proposed files. Submit a task to review changes.'));
        renderSelectedChange();
        return;
      }
      state.changes.forEach(change => {
        const button = makeElement('button', 'file-nav');
        button.type = 'button';
        button.dataset.action = 'select-file';
        button.dataset.changeId = change.id;
        button.setAttribute('aria-current', change.id === state.selectedId ? 'true' : 'false');
        button.appendChild(makeElement('span', 'file-nav-path', change.path));
        button.appendChild(makeElement('span', 'file-nav-state', changeState(change)));
        fileList.appendChild(button);
      });
      renderSelectedChange();
    }

    function diffRows(change) {
      const splitLines = content => {
        if (!content) return [];
        const lines = String(content).split(/\\r?\\n/);
        if (lines[lines.length - 1] === '') lines.pop();
        return lines;
      };
      const original = splitLines(change.originalContent || '');
      const proposed = splitLines(change.proposedContent || '');
      const hunks = Array.isArray(change.hunks) ? change.hunks : [];
      const rows = [];
      let oldIndex = 0;
      let newIndex = 0;
      const addRow = (type, oldLine, newLine, oldNumber, newNumber, hunkId) => {
        rows.push({ type, oldLine, newLine, oldNumber, newNumber, hunkId });
      };
      const appendGap = (oldTarget, newTarget) => {
        while (oldIndex < oldTarget || newIndex < newTarget) {
          if (oldIndex < oldTarget && newIndex < newTarget) {
            addRow('context', original[oldIndex], proposed[newIndex], oldIndex + 1, newIndex + 1);
            oldIndex++;
            newIndex++;
          } else if (oldIndex < oldTarget) {
            addRow('remove', original[oldIndex], null, oldIndex + 1, null);
            oldIndex++;
          } else {
            addRow('add', null, proposed[newIndex], null, newIndex + 1);
            newIndex++;
          }
        }
      };

      if (hunks.length === 0 && String(change.originalContent || '') !== String(change.proposedContent || '')) {
        original.forEach((line, index) => addRow('remove', line, null, index + 1, null));
        proposed.forEach((line, index) => addRow('add', null, line, null, index + 1));
        return rows;
      }

      hunks.forEach(hunk => {
        const oldTarget = Math.min(original.length, Math.max(oldIndex, hunk.originalStart > 0 ? hunk.originalStart - 1 : 0));
        const newTarget = Math.min(proposed.length, Math.max(newIndex, hunk.proposedStart > 0 ? hunk.proposedStart - 1 : 0));
        appendGap(oldTarget, newTarget);
        (Array.isArray(hunk.lines) ? hunk.lines : []).forEach(line => {
          if (line.type === 'context') {
            addRow('context', line.content, line.content, oldIndex + 1, newIndex + 1, hunk.id);
            oldIndex++;
            newIndex++;
          } else if (line.type === 'remove') {
            addRow('remove', line.content, null, oldIndex + 1, null, hunk.id);
            oldIndex++;
          } else if (line.type === 'add') {
            addRow('add', null, line.content, null, newIndex + 1, hunk.id);
            newIndex++;
          }
        });
      });
      appendGap(original.length, proposed.length);
      return rows;
    }

    function renderDiff(change, container, readOnly) {
      const rows = diffRows(change);
      const added = rows.filter(row => row.type === 'add').length;
      const removed = rows.filter(row => row.type === 'remove').length;
      const meta = container.querySelector('.review-meta');
      meta.appendChild(makeElement('span', '', '+' + added + ' additions'));
      meta.appendChild(makeElement('span', '', '-' + removed + ' deletions'));

      const modeButton = makeElement('button', 'secondary diff-mode', state.diffMode === 'side-by-side' ? 'Unified view' : 'Side-by-side view');
      modeButton.type = 'button';
      modeButton.dataset.action = 'toggle-diff';
      meta.appendChild(modeButton);
      const diff = makeElement('div', 'diff-content');
      diff.setAttribute('aria-label', 'Complete original and proposed file comparison');
      let renderedHunkId = null;
      const appendHunkControl = hunkId => {
        const hunk = change.hunks.find(item => item.id === hunkId);
        if (!hunk) return;
        const control = makeElement('div', 'hunk-review-control');
        control.appendChild(makeElement('span', 'hunk-review-title', hunk.header));
        const decision = state.hunkDecisions.get(hunk.id);
        control.appendChild(makeElement('span', 'hunk-review-state',
          decision === 'accept' ? 'Acceptance requested locally' :
            decision === 'reject' ? 'Rejection requested locally' : 'Not reviewed'));
        const accept = makeElement('button', 'secondary', 'Accept Hunk');
        accept.type = 'button';
        accept.dataset.action = 'accept-hunk';
        accept.dataset.changeId = change.id;
        accept.dataset.hunkId = hunk.id;
        accept.disabled = state.outcomes.get(change.id) === 'Applied' || state.applying;
        const reject = makeElement('button', 'secondary', 'Reject Hunk');
        reject.type = 'button';
        reject.dataset.action = 'reject-hunk';
        reject.dataset.changeId = change.id;
        reject.dataset.hunkId = hunk.id;
        reject.disabled = state.outcomes.get(change.id) === 'Applied' || state.applying;
        control.appendChild(accept);
        control.appendChild(reject);
        diff.appendChild(control);
      };
      const appendHunkControlForRow = row => {
        if (!readOnly && row.hunkId && row.hunkId !== renderedHunkId) appendHunkControl(row.hunkId);
        renderedHunkId = row.hunkId || null;
      };
      if (state.diffMode === 'side-by-side') {
        const labels = makeElement('div', 'diff-labels');
        labels.appendChild(makeElement('span', '', 'Original'));
        labels.appendChild(makeElement('span', '', 'Proposed'));
        diff.appendChild(labels);
        rows.forEach(row => {
          appendHunkControlForRow(row);
          const rowElement = makeElement('div', 'diff-row diff-' + row.type);
          rowElement.appendChild(createSideCell(row.oldNumber, row.oldLine));
          rowElement.appendChild(createSideCell(row.newNumber, row.newLine));
          diff.appendChild(rowElement);
        });
      } else {
        rows.forEach(row => {
          appendHunkControlForRow(row);
          const rowElement = makeElement('div', 'unified-row diff-' + row.type);
          const prefix = row.type === 'add' ? '+' : row.type === 'remove' ? '-' : ' ';
          const number = row.type === 'add' ? row.newNumber : row.oldNumber;
          rowElement.appendChild(makeElement('span', 'unified-prefix', prefix));
          rowElement.appendChild(makeElement('span', 'unified-number', number === null ? '' : number));
          rowElement.appendChild(makeElement('span', 'unified-content', row.type === 'remove' ? row.oldLine : row.newLine));
          diff.appendChild(rowElement);
        });
      }
      container.appendChild(diff);
    }

    function createSideCell(number, content) {
      const cell = makeElement('div', 'diff-cell');
      cell.appendChild(makeElement('span', 'line-number', number === null ? '' : number));
      cell.appendChild(makeElement('span', 'line-content', content === null ? '' : content));
      return cell;
    }

    function renderSelectedChange() {
      clear(reviewDetail);
      const change = state.changes.find(item => item.id === state.selectedId);
      if (!change) {
        reviewDetail.appendChild(makeElement('div', 'review-empty',
          state.changes.length === 0 ? 'Proposed changes will appear here.' : 'Select a file to review its complete changes.'));
        return;
      }
      const header = makeElement('div', 'review-header');
      header.appendChild(makeElement('h3', '', change.path));
      header.appendChild(makeElement('p', 'review-reason', change.reason || 'No change summary provided.'));
      const meta = makeElement('div', 'review-meta');
      meta.appendChild(makeElement('span', 'state-badge', changeState(change)));
      header.appendChild(meta);
      const actions = makeElement('div', 'toolbar');
      const accept = makeElement('button', '', 'Accept File');
      accept.type = 'button';
      accept.dataset.action = 'accept-file';
      accept.dataset.changeId = change.id;
      accept.disabled = state.outcomes.get(change.id) === 'Applied' || state.applying;
      const reject = makeElement('button', 'secondary', 'Reject File');
      reject.type = 'button';
      reject.dataset.action = 'reject-file';
      reject.dataset.changeId = change.id;
      reject.disabled = state.outcomes.get(change.id) === 'Applied' || state.applying;
      actions.appendChild(accept);
      actions.appendChild(reject);
      header.appendChild(actions);
      if (state.decisions.has(change.id) && !state.outcomes.has(change.id)) {
        header.appendChild(makeElement('p', 'decision-note',
          'This is local review feedback. The extension has not confirmed the decision; application is confirmed only by its result.'));
      }
      reviewDetail.appendChild(header);
      renderDiff(change, reviewDetail);
    }

    function renderReceipt(receipt) {
      clear(receiptBody);
      const items = Array.isArray(receipt.items) ? receipt.items : [];
      receiptCount.textContent = items.length ? '(' + items.length + ' selected)' : '(no files selected)';
      const summaryParts = [
        items.length + ' selected',
        (receipt.excluded || 0) + ' matched candidates excluded by budget',
        (receipt.totalTokens || 0) + ' of ' + (receipt.budget || 0) + ' estimated tokens'
      ];
      receiptBody.appendChild(makeElement('p', 'receipt-summary', summaryParts.join(' | ')));
      const excludedItems = Array.isArray(receipt.excludedItems) ? receipt.excludedItems : [];
      if (excludedItems.length) {
        const excluded = makeElement('details', 'receipt-item');
        excluded.appendChild(makeElement('summary', '', 'Excluded files (' + excludedItems.length + ')'));
        excludedItems.forEach(item => {
          const reason = item.reason === 'context_budget'
            ? 'Excluded because the context token budget was insufficient'
            : 'Exclusion reason not provided';
          excluded.appendChild(makeElement('p', 'receipt-summary', (item.path || 'Unknown file') + ' - ' + reason));
        });
        receiptBody.appendChild(excluded);
      } else {
        receiptBody.appendChild(makeElement('p', 'receipt-summary',
          'Excluded file names and exclusion reasons: not provided by the context backend.'));
      }
      receiptBody.appendChild(makeElement('p', 'receipt-summary',
        'These are the automatically selected snippets included with the request. Later tool reads and their observed results are listed separately in Agent activity.'));
      receiptBody.appendChild(makeElement('p', 'receipt-summary',
        'Estimated: token counts and relevance scores are estimates. Verified: no backend-verified context field is available beyond the assembled snippets shown below.'));
      if (Array.isArray(receipt.queryTerms) && receipt.queryTerms.length) {
        receiptBody.appendChild(makeElement('p', 'receipt-summary', 'Query terms: ' + receipt.queryTerms.join(', ')));
      }
      if (!items.length) {
        receiptBody.appendChild(makeElement('p', 'receipt-summary', 'No workspace files were selected as context for this request.'));
        return;
      }
      items.forEach(item => {
        const details = makeElement('details', 'receipt-item');
        details.appendChild(makeElement('summary', '', item.path || 'Unknown file'));
        const info = [
          'Lines ' + (Number(item.startLine || 0) + 1) + '-' + (Number(item.endLine || 0) + 1),
          (item.tokenEstimate || 0) + ' estimated tokens',
          'Score ' + (item.score || 0),
          'Signals: ' + ((Array.isArray(item.signals) && item.signals.length) ? item.signals.join(', ') : 'none reported')
        ];
        details.appendChild(makeElement('p', 'receipt-summary', info.join(' | ')));
        details.appendChild(makeElement('pre', '', item.content || 'No excerpt provided.'));
        receiptBody.appendChild(details);
      });
    }

    function showError(message, recoverable) {
      clear(errorArea);
      const banner = makeElement('div', 'error-banner');
      banner.setAttribute('role', 'alert');
      banner.appendChild(makeElement('div', 'banner-heading', recoverable ? 'Request failed - you can try again' : 'Request failed'));
      banner.appendChild(makeElement('p', '', message || 'An unexpected error occurred.'));
      const dismiss = makeElement('button', 'secondary', 'Dismiss');
      dismiss.type = 'button';
      dismiss.dataset.action = 'dismiss-error';
      banner.appendChild(dismiss);
      errorArea.appendChild(banner);
    }

    function showApplyResult(result) {
      const applied = Array.isArray(result.applied) ? result.applied : [];
      const restored = Array.isArray(result.restored) ? result.restored : [];
      const unchanged = Array.isArray(result.unchanged) ? result.unchanged : [];
      const manualRecovery = Array.isArray(result.manualRecovery) ? result.manualRecovery : [];
      const failed = Array.isArray(result.failed) ? result.failed : [];
      const conflicts = Array.isArray(result.conflicts) ? result.conflicts : [];
      const resultPaths = new Set([...applied, ...restored, ...unchanged, ...manualRecovery, ...conflicts, ...failed]);
      resultPaths.forEach(path => {
        const matchingChanges = state.changes.filter(change => change.path === path);
        const outcome = manualRecovery.indexOf(path) !== -1 ? 'Manual recovery required' :
          applied.indexOf(path) !== -1 ? 'Applied' :
          restored.indexOf(path) !== -1 ? 'Restored' :
          unchanged.indexOf(path) !== -1 ? 'Unchanged' :
          conflicts.indexOf(path) !== -1 ? 'Conflict' : 'Failed';
        matchingChanges.forEach(change => {
          state.outcomes.set(change.id, matchingChanges.length === 1 ? outcome : 'Ambiguous');
        });
      });
      clear(resultArea);
      const banner = makeElement('div', 'result-banner ' + (result.success ? 'success' : 'failure'));
      banner.setAttribute('role', 'status');
      const hasIssues = failed.length > 0 || conflicts.length > 0 || manualRecovery.length > 0;
      banner.appendChild(makeElement('div', 'banner-heading',
        result.success ? (applied.length ? 'Changes applied successfully' : 'Apply completed; no files were applied') :
          (hasIssues ? 'Some changes could not be applied' : 'Apply did not complete successfully')));
      appendPathList(banner, 'Applied', applied);
      appendPathList(banner, 'Restored after a failed batch', restored);
      appendPathList(banner, 'Left unchanged', unchanged);
      appendPathList(banner, 'Conflicts - the file changed since the proposal', conflicts);
      appendPathList(banner, 'Failed', failed);
      appendPathList(banner, 'Manual recovery required - files or temporary data may need attention', manualRecovery);
      if (state.changes.some(change => state.outcomes.get(change.id) === 'Ambiguous')) {
        banner.appendChild(makeElement('p', 'decision-note',
          'Some results identify only a file path shared by multiple proposals. Those proposal-level outcomes are ambiguous.'));
      }
      resultArea.appendChild(banner);
      state.applying = false;
      updateReviewSummary();
    }

    function appendPathList(container, title, paths) {
      if (!paths.length) return;
      container.appendChild(makeElement('div', 'banner-heading', title));
      const list = makeElement('ul', 'banner-list');
      paths.forEach(path => list.appendChild(makeElement('li', '', path)));
      container.appendChild(list);
    }

    document.getElementById('prompt-form').addEventListener('submit', event => {
      event.preventDefault();
      if (state.busy) return;
      state.lastSubmittedText = input.value;
      clear(errorArea);
      clear(resultArea);
      output.textContent = '';
      state.activities = [];
      renderActivity();
      state.verifyEvents = [];
      renderVerification();
      setBusy(true);
      vscode.postMessage({ type: 'submit', text: input.value });
      input.value = '';
    });

    exploreButton.addEventListener('click', () => setFuturesMode(probeRow.hidden));
    exploreBackButton.addEventListener('click', () => setFuturesMode(false));
    exploreStartButton.addEventListener('click', startExplore);
    probeInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        startExplore();
      }
    });

    cancelButton.addEventListener('click', () => {
      if (!state.busy) return;
      status.textContent = 'Cancellation requested; waiting for the agent response.';
      vscode.postMessage({ type: 'cancel' });
    });

    applyButton.addEventListener('click', () => {
      if (state.applying || applyButton.disabled) return;
      state.applying = true;
      clear(resultArea);
      status.textContent = 'Applying accepted files...';
      updateReviewSummary();
      vscode.postMessage({ type: 'apply_accepted' });
    });

    acceptAllButton.addEventListener('click', () => {
      if (acceptAllButton.disabled) return;
      state.changes.forEach(change => {
        state.decisions.set(change.id, 'accept');
        change.hunks.forEach(hunk => state.hunkDecisions.delete(hunk.id));
        state.outcomes.delete(change.id);
        vscode.postMessage({ type: 'accept_file', changeId: change.id });
      });
      updateReviewSummary();
    });

    rejectAllButton.addEventListener('click', () => {
      if (rejectAllButton.disabled) return;
      state.changes.forEach(change => {
        state.decisions.set(change.id, 'reject');
        change.hunks.forEach(hunk => state.hunkDecisions.delete(hunk.id));
        state.outcomes.delete(change.id);
        vscode.postMessage({ type: 'reject_file', changeId: change.id });
      });
      updateReviewSummary();
    });

    document.getElementById('discard').addEventListener('click', () => {
      if (state.applying) return;
      vscode.postMessage({ type: 'discard_all' });
      state.changes = [];
      state.selectedId = null;
      state.decisions.clear();
      state.hunkDecisions.clear();
      state.outcomes.clear();
      state.applying = false;
      clear(resultArea);
      state.verifyEvents = [];
      state.passport = null;
      state.futures = emptyFutures();
      renderFutures();
      renderVerification();
      renderPassport();
      updateReviewSummary();
    });

    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
      if (!target) return;
      const action = target.dataset.action;
      const changeId = target.dataset.changeId;
      if (action === 'dismiss-error') {
        clear(errorArea);
      } else if (action === 'copy-passport') {
        vscode.postMessage({ type: 'copy_passport' });
      } else if (action === 'view-future') {
        state.futures.viewing = state.futures.viewing === target.dataset.futureId ? null : target.dataset.futureId;
        state.futures.viewFileIndex = 0;
        renderFutures();
      } else if (action === 'future-file') {
        state.futures.viewFileIndex = Number(target.dataset.index) || 0;
        renderFutures();
      } else if (action === 'choose-future') {
        if (state.busy || state.futures.chosen) return;
        clear(errorArea);
        vscode.postMessage({ type: 'choose_future', futureId: target.dataset.futureId });
      } else if (action === 'select-file' && changeId) {
        state.selectedId = changeId;
        renderFileList();
      } else if (action === 'toggle-diff') {
        state.diffMode = state.diffMode === 'side-by-side' ? 'unified' : 'side-by-side';
        renderSelectedChange();
        renderFutures();
      } else if (action === 'accept-file' && changeId) {
        state.decisions.set(changeId, 'accept');
        const change = state.changes.find(item => item.id === changeId);
        if (change) change.hunks.forEach(hunk => state.hunkDecisions.delete(hunk.id));
        state.outcomes.delete(changeId);
        vscode.postMessage({ type: 'accept_file', changeId });
        updateReviewSummary();
      } else if (action === 'reject-file' && changeId) {
        state.decisions.set(changeId, 'reject');
        const change = state.changes.find(item => item.id === changeId);
        if (change) change.hunks.forEach(hunk => state.hunkDecisions.delete(hunk.id));
        state.outcomes.delete(changeId);
        vscode.postMessage({ type: 'reject_file', changeId });
        updateReviewSummary();
      } else if ((action === 'accept-hunk' || action === 'reject-hunk') && changeId && target.dataset.hunkId) {
        const decision = action === 'accept-hunk' ? 'accept' : 'reject';
        const change = state.changes.find(item => item.id === changeId);
        const previousDecision = state.decisions.get(changeId);
        if (change && previousDecision) {
          change.hunks.forEach(hunk => state.hunkDecisions.set(hunk.id, previousDecision));
        }
        state.decisions.delete(changeId);
        state.hunkDecisions.set(target.dataset.hunkId, decision);
        state.outcomes.delete(changeId);
        vscode.postMessage({
          type: action === 'accept-hunk' ? 'accept_hunk' : 'reject_hunk',
          changeId,
          hunkId: target.dataset.hunkId,
        });
        updateReviewSummary();
      }
    });

    window.addEventListener('message', event => {
      const message = event.data;
      if (!message || typeof message.type !== 'string') return;
      if (message.type === 'text_delta') {
        if (output.textContent === 'The agent response will appear here.') output.textContent = '';
        output.textContent += message.content || '';
      } else if (message.type === 'tool_start') {
        updateActivity({
          id: message.id,
          name: message.name || 'Tool request',
          status: message.status === 'approval_required' ? 'Approval required' : 'Tool request observed',
          argsPreview: message.argsPreview || '',
        });
      } else if (message.type === 'tool_done') {
        updateActivity({
          id: message.id,
          name: message.name || state.activities.find(item => item.id === message.id)?.name || 'Tool response',
          status: message.isError === true ? 'Tool reported an error' :
            message.isError === false ? 'Explicit tool success result received' :
            'Tool response received; success or failure not provided',
          resultPreview: message.resultPreview || '',
        });
      } else if (message.type === 'text_done') {
        output.textContent = message.fullContent || '';
      } else if (message.type === 'turn_done') {
        setBusy(false);
        status.textContent = message.status === 'cancelled' ? 'Turn cancelled.' :
          message.status === 'error' ? 'The turn ended with an error.' : 'Turn complete.';
        updateActivity({
          id: 'terminal-' + state.activities.length,
          name: 'Agent turn',
          status: message.message || (message.status === 'done' ? 'Turn completed' :
            message.status === 'cancelled' ? 'Turn cancelled' : 'Turn ended with an error'),
        });
      } else if (message.type === 'error') {
        setBusy(false);
        if (!input.value && state.lastSubmittedText) input.value = state.lastSubmittedText;
        showError(message.message, message.recoverable);
        updateActivity({ id: 'error-' + state.activities.length, name: 'Request error', status: message.message || 'Request failed' });
      } else if (message.type === 'context_receipt') {
        renderReceipt(message.receipt || {});
      } else if (message.type === 'pending_change' && message.change && message.change.id) {
        const index = state.changes.findIndex(change => change.id === message.change.id);
        if (index === -1) state.changes.push(message.change);
        else state.changes[index] = message.change;
        if (!state.selectedId) state.selectedId = message.change.id;
        clear(resultArea);
        updateReviewSummary();
      } else if (message.type === 'change_removed') {
        const removedChange = state.changes.find(change => change.id === message.changeId);
        if (removedChange) removedChange.hunks.forEach(hunk => state.hunkDecisions.delete(hunk.id));
        state.changes = state.changes.filter(change => change.id !== message.changeId);
        state.decisions.delete(message.changeId);
        state.outcomes.delete(message.changeId);
        if (state.selectedId === message.changeId) state.selectedId = state.changes.length ? state.changes[0].id : null;
        updateReviewSummary();
      } else if (message.type === 'apply_result') {
        showApplyResult(message);
      } else if (message.type === 'busy') {
        if (message.busy) {
          setBusy(true);
          if (message.label) status.textContent = message.label;
        } else {
          setBusy(false);
          const last = state.verifyEvents[state.verifyEvents.length - 1];
          status.textContent = !last ? 'Turn complete.' :
            last.phase === 'passed' ? 'Done · changes verified in a sandbox. Review and apply.' :
            last.phase === 'failed' ? 'Done · tests still failing — review carefully before applying.' : 'Turn complete.';
        }
      } else if (message.type === 'model_info') {
        modelBadge.hidden = false;
        modelBadge.textContent = message.model + (message.fallbackFrom ? '  ·  fallback from ' + message.fallbackFrom : '');
        modelBadge.className = 'model-badge' + (message.fallbackFrom ? ' fallback' : '');
        modelBadge.title = message.fallbackFrom ? 'Automatic fallback: ' + message.fallbackFrom + ' failed' : 'Model answering this request';
      } else if (message.type === 'verification') {
        const last = state.verifyEvents[state.verifyEvents.length - 1];
        if (last && last.phase === 'running' && message.phase !== 'fixing') state.verifyEvents.pop();
        state.verifyEvents.push(message);
        renderVerification();
      } else if (message.type === 'passport') {
        state.passport = message.passport || null;
        renderPassport();
      } else if (message.type === 'futures_config') {
        if (!probeInput.value) probeInput.value = message.probeCommand || '';
      } else if (message.type === 'futures_plan') {
        state.futures = emptyFutures();
        state.futures.strategies = message.strategies || [];
        state.futures.usedFallback = Boolean(message.usedFallback);
        state.verifyEvents = [];
        state.passport = null;
        renderVerification();
        renderPassport();
        output.textContent = 'Voltix is building each strategy in its own isolated future. Your files are not being changed.';
        renderFutures();
      } else if (message.type === 'future_progress') {
        state.futures.phases[message.futureId] = { phase: message.phase, label: message.label };
        renderFutures();
      } else if (message.type === 'future_result') {
        state.futures.results[message.futureId] = { evidence: message.evidence, passport: message.passport, changes: message.changes || [] };
        renderFutures();
      } else if (message.type === 'futures_compare') {
        state.futures.rows = message.rows || [];
        output.textContent = 'Both futures are ready. Compare the evidence, then choose one.';
        status.textContent = 'Compare the evidence, then choose a future.';
        renderFutures();
      } else if (message.type === 'regret') {
        state.futures.regret = message;
        renderFutures();
      } else if (message.type === 'futures_chosen') {
        state.futures.chosen = { futureId: message.futureId, otherId: message.otherId };
        output.textContent = 'Future ' + message.futureId + ' moved to Proposed files. Nothing is written until you accept and apply it.';
        status.textContent = 'Chose Future ' + message.futureId + ' over ' + message.otherId + '. Review its changes below.';
        renderFutures();
      } else if (message.type === 'futures_cleared') {
        state.futures = emptyFutures();
        renderFutures();
      }
    });

    cancelButton.disabled = true;
    updateReviewSummary();
    vscode.postMessage({ type: 'panel_ready' });
  </script>
</body>
</html>`;
  }
}
