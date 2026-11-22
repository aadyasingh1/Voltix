/** The Voltix UI, shared by the sidebar view and the editor tab. */
export function buildAgentHtml(): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    /* Theme backgrounds and typography come from VS Code; Voltix tokens are accents. */
    *{box-sizing:border-box}
    :root{--tf-radius:12px;--tf-border:var(--vx-line);--tf-card:var(--vscode-editor-background);--tf-muted:var(--vscode-descriptionForeground);--tf-accent:var(--vx-violet);--tf-ok:var(--vx-success);--tf-bad:var(--vx-danger);--tf-warn:var(--vx-warning);--tf-tint:var(--vx-raised)}
    body.vscode-dark{--vx-violet:#6E56CF;--vx-violet-text:#A594F9;--vx-success:#3DD68C;--vx-warning:#F0A93B;--vx-danger:#F2705E;--vx-line:#2E2D36;--vx-raised:#24232B}
    body.vscode-light{--vx-violet:#6E56CF;--vx-violet-text:#5B45BF;--vx-success:#1A7346;--vx-warning:#8C5300;--vx-danger:#B3362A;--vx-line:#DCD9E2;--vx-raised:#EFEDF3}
    body{margin:0;padding:12px;font-family:var(--vscode-font-family);font-size:var(--vscode-font-size,13px);line-height:1.5;color:var(--vscode-foreground);background:var(--vscode-editor-background)}
    [hidden]{display:none!important}
    h1,h2,h3,p{margin-top:0}
    h2{font-size:13px;font-weight:600;text-transform:none;letter-spacing:0;color:var(--vscode-foreground)}
    h3{font-size:14px;font-weight:600}
    button{font-family:var(--vscode-font-family);font-size:12px;font-weight:500;color:var(--vscode-foreground);background:transparent;border:1px solid var(--vx-line);border-radius:8px;padding:6px 14px;cursor:pointer;transition:background-color .12s,filter .12s,opacity .12s}
    button:hover{background:var(--vscode-button-hoverBackground)}
    button:disabled{opacity:.45;cursor:default}
    button.secondary{color:var(--vscode-foreground);background:transparent;border:1px solid var(--vx-line)}
    button.secondary:hover{background:var(--vx-raised)}
    button.danger{color:var(--vx-danger);background:transparent;border-color:var(--vx-line)}
    button.danger:hover:not(:disabled){background:var(--vx-raised)}
    #submit,#explore-start,#apply:not(:disabled),button.primary{background:var(--vx-violet);color:#fff;border:none;border-radius:8px}
    #submit:hover:not(:disabled),#explore-start:hover:not(:disabled),#apply:hover:not(:disabled),button.primary:hover:not(:disabled){background-image:none;filter:brightness(1.08)}
    button:focus-visible,textarea:focus-visible{outline:1px solid var(--vscode-focusBorder);outline-offset:2px}
    textarea{display:block;width:100%;min-height:84px;resize:vertical;margin:0 0 10px;padding:10px 12px;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--tf-border));border-radius:var(--tf-radius);font-family:var(--vscode-font-family);font-size:13px}
    textarea:focus{border-color:var(--vscode-focusBorder);outline:none}
    textarea::placeholder{color:var(--vscode-input-placeholderForeground)}
    label{display:block;margin-bottom:6px;font-weight:600;font-size:12px;color:var(--tf-muted)}
    code,pre,.diff-row,.unified-row,.activity-preview,.receipt-item pre,.file-nav,.hunk-review-title{font-family:var(--vscode-editor-font-family)}
    .toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
    #status{min-height:20px;margin:8px 0;color:var(--tf-muted);font-size:12px}
    .error-banner,.result-banner{margin:10px 0;padding:10px 12px;border:1px solid var(--vx-line);border-radius:12px;background:var(--tf-card)}
    .approval-banner{margin:10px 0;padding:10px 12px;border:1px solid var(--vx-violet);border-radius:12px;background:var(--tf-card);font-weight:600}
    .banner-heading{font-weight:600;margin-bottom:4px}
    .banner-list{margin:6px 0 0;padding-left:20px}
    #conversation{display:flex;flex-direction:column;gap:10px;margin:8px 0 16px;max-height:520px;overflow:auto}
    .chat-message{min-width:0;max-width:96%;padding:10px 12px;border:1px solid var(--vx-line);border-radius:12px;white-space:pre-wrap;overflow-wrap:anywhere}
    .chat-message.user{align-self:flex-end;background:var(--vscode-input-background)}
    .chat-message.assistant{align-self:flex-start;background:var(--tf-card)}
    .chat-role{margin-bottom:4px;color:var(--tf-muted);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
    .chat-content{min-height:1em}
    .chat-empty{padding:10px 12px;color:var(--tf-muted);border:1px solid var(--vx-line);border-radius:12px}
    .changed-files-summary{margin:10px 0 16px;padding:10px 12px;border:1px solid var(--vx-line);border-radius:12px;background:var(--tf-card)}
    .changed-files-summary>*{min-width:0}
    .changed-files-title{display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--vscode-foreground)}
    .changed-files-list{display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none}
    .changed-file-row{min-width:0;font-size:12px;overflow-wrap:anywhere}
    .panel-section{margin:14px 0;border:1px solid var(--vx-line);border-radius:12px;background:var(--tf-card);overflow:hidden}
    .panel-section>summary{cursor:pointer;padding:10px 12px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--tf-muted)}
    .panel-section>summary:hover{color:var(--vscode-foreground)}
    .receipt-body{padding:0 12px 12px}
    .receipt-summary{color:var(--tf-muted);margin:0 0 8px}
    .context-progress{height:7px;margin:6px 0 8px;border-radius:999px;background:var(--vx-raised);overflow:hidden}
    .context-progress-fill{height:100%;width:0;background:var(--vx-violet);transition:width .15s}
    .context-files,.context-left-out{margin:4px 0;color:var(--tf-muted);font-size:11px;overflow-wrap:anywhere}
    .context-file{display:block}
    .context-file-row{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-top:1px solid var(--tf-border);font-size:11.5px}
    .context-file-row>*{min-width:0}
    .context-file-name{overflow-wrap:anywhere}
    .context-file-meta{flex:none;color:var(--tf-muted);text-align:right}
    .context-left-details{margin-top:6px;font-size:11.5px}
    .context-left-details summary{cursor:pointer;color:var(--tf-muted)}
    .context-left-file{display:block;padding:3px 0;overflow-wrap:anywhere}
    .read-by-agent{margin-top:8px;color:var(--tf-muted);font-size:11.5px}
    .read-by-agent-title{display:block;margin-bottom:3px;font-weight:600;color:var(--vscode-foreground)}
    .receipt-item{border-top:1px solid var(--tf-border);padding:8px 0}
    .receipt-item summary{cursor:pointer;overflow-wrap:anywhere}
    .receipt-item pre{max-height:240px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:8px 10px;background:var(--vscode-textCodeBlock-background,var(--vscode-editor-background));border:1px solid var(--tf-border);border-radius:6px;font-size:12px;line-height:1.5}
    #activity-list{margin:0;padding:0;list-style:none;max-height:360px;overflow:auto}
    .activity-item{position:relative;padding:9px 12px 9px 28px;border-top:1px solid var(--tf-border)}
    .activity-item::before{content:"";position:absolute;left:12px;top:15px;width:7px;height:7px;border-radius:50%;background:var(--tf-accent)}
    .activity-title{font-weight:600;font-family:var(--vscode-editor-font-family);color:var(--vx-violet-text)}
    .activity-status,.activity-preview{color:var(--tf-muted);margin:3px 0 0}
    .activity-raw{margin-top:4px;color:var(--tf-muted);font-size:11px}
    .activity-raw summary{cursor:pointer}
    .activity-preview{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11.5px;max-height:120px;overflow:hidden}
    #activity-heading{padding:10px 12px;margin:0}
    .review-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:20px 0 10px}
    .review-heading>*{min-width:0}
    .review-heading h2{margin:0}
    #review-counts{color:var(--tf-muted);font-size:12px}
    .review-actions{display:flex;gap:8px}
    .review-actions>*{min-width:0}
    .review-layout{display:grid;grid-template-columns:minmax(150px,240px) minmax(0,1fr);gap:12px;align-items:start}
    .review-layout>*{min-width:0}
    #file-list{display:flex;flex-direction:column;gap:6px}
    #file-list>*{min-width:0}
    .file-nav{width:100%;text-align:left;color:var(--vscode-foreground);background:var(--tf-card);border:1px solid var(--tf-border);border-radius:6px;overflow-wrap:anywhere;font-size:12px}
    .file-nav:hover{background:var(--vscode-list-hoverBackground)}
    .file-nav[aria-current="true"]{background:var(--vx-raised);color:var(--vscode-foreground);border-color:var(--vx-violet)}
    .file-nav-path,.file-nav-state{display:block}
    .file-nav-state{margin-top:4px;color:var(--tf-muted);font-size:11px}
    #review-detail{min-width:0;min-height:160px;border:1px solid var(--tf-border);border-radius:var(--tf-radius);overflow:hidden;background:var(--vscode-editor-background)}
    .review-empty{padding:18px;color:var(--tf-muted)}
    .review-header{position:sticky;top:0;z-index:2;padding:12px 14px;background:var(--tf-card);border-bottom:1px solid var(--tf-border)}
    .review-header h3{margin:0 0 5px;overflow-wrap:anywhere;font-family:var(--vscode-editor-font-family)}
    .review-reason{margin:0 0 8px;color:var(--tf-muted);white-space:pre-wrap;overflow-wrap:anywhere}
    .review-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:var(--tf-muted);margin-bottom:8px}
    .state-badge{display:inline-block;padding:1px 8px;border:1px solid var(--vx-line);border-radius:999px;font-size:11px;font-weight:600;background:var(--vx-raised);color:var(--vscode-foreground)}
    .decision-note{margin:8px 0 0;color:var(--tf-muted)}
    .diff-mode{margin-left:auto}
    .diff-labels,.diff-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
    .diff-labels{background:var(--tf-card);border-bottom:1px solid var(--tf-border);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--tf-muted)}
    .diff-labels span{padding:6px 8px}
    .diff-labels span+span,.diff-cell+.diff-cell{border-left:1px solid var(--tf-border)}
    .diff-row,.unified-row{min-width:0;font-size:12px;line-height:1.6}
    .hunk-review-control{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:6px 10px;background:var(--tf-card);border-top:1px solid var(--tf-border)}
    .hunk-review-title{flex:1 1 220px;color:var(--tf-muted);font-size:12px}
    .hunk-review-state{color:var(--vx-violet-text)}
    .diff-cell{display:flex;min-width:0;white-space:pre}
    .line-number{flex:0 0 4em;padding:0 6px;text-align:right;color:var(--vscode-editorLineNumber-foreground);user-select:none}
    .line-content{min-width:0;overflow-x:auto;padding:0 8px}
    .diff-add .diff-cell,.unified-row.diff-add{background:color-mix(in srgb,var(--vx-success) 14%,var(--vscode-editor-background))}
    .diff-remove .diff-cell,.unified-row.diff-remove{background:color-mix(in srgb,var(--vx-danger) 14%,var(--vscode-editor-background))}
    .unified-row{display:flex;white-space:pre}
    .unified-prefix{flex:0 0 1.5em;text-align:center;color:var(--tf-muted)}
    .unified-number{flex:0 0 5em;color:var(--vscode-editorLineNumber-foreground);text-align:right;padding-right:6px}
    .unified-content{min-width:0;overflow-x:auto;padding:0 8px}
    .diff-row+.diff-row,.unified-row+.unified-row{border-top:1px solid transparent}
    .meta-row{display:flex;align-items:center;gap:8px;min-height:22px;margin:4px 0 2px}
    .model-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;padding:2px 10px;border-radius:999px;border:1px solid var(--tf-border);color:var(--tf-muted);font-family:var(--vscode-editor-font-family)}
    .model-badge::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--vx-success)}
    .model-badge.fallback{color:var(--vx-warning);border-color:var(--vx-warning)}
    .model-badge.fallback::before{background:var(--vx-warning)}
    .card{margin:12px 0;border:1px solid var(--vx-line);border-radius:12px;background:var(--tf-card);overflow:hidden}
    .card-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--tf-border)}
    .card-title{font-size:13px;font-weight:600;text-transform:none;letter-spacing:0;color:var(--vscode-foreground);margin-right:auto}
    .pill{display:inline-flex;align-items:center;gap:6px;padding:2px 9px;border:1px solid var(--vx-line);border-radius:999px;background:var(--vx-raised);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
    .pill::before{content:"";width:6px;height:6px;flex:none;border-radius:50%;background:currentColor}
    .pill.ok{color:var(--vx-success)}
    .pill.bad{color:var(--vx-danger)}
    .pill.warn{color:var(--vx-warning)}
    .pill.info{color:var(--vx-violet-text)}
    .pill.muted{color:var(--tf-muted)}
    .verify-card{border:1px solid var(--vx-line);border-radius:12px}
    .verify-steps{list-style:none;margin:0;padding:6px 12px 10px}
    .verify-step{display:grid;grid-template-columns:22px minmax(0,1fr);gap:6px;padding:5px 0;align-items:start}
    .verify-step>*{min-width:0}
    .verify-step+.verify-step{border-top:1px dashed var(--tf-border)}
    .step-icon{position:relative;width:14px;height:14px;justify-self:center;font-size:0}
    .step-icon.ok{color:var(--vx-success)}
    .step-icon.bad{color:var(--vx-danger)}
    .step-icon.ok::before{content:"";position:absolute;left:3px;top:2px;width:7px;height:4px;border-left:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg)}
    .step-icon.bad::before{content:"!";position:absolute;inset:0;color:var(--vx-danger);font-size:12px;font-weight:700;text-align:center}
    .step-icon.run::before{content:"";position:absolute;inset:1px;border:2px solid var(--vx-violet-text);border-right-color:transparent;border-radius:50%;animation:tfspin 1s linear infinite}
    .step-main{min-width:0}
    .step-text{font-weight:500}
    .step-cmd{display:block;margin-top:2px;font-family:var(--vscode-editor-font-family);font-size:11.5px;color:var(--tf-muted);overflow-wrap:anywhere}
    .step-output{margin:6px 0 0;max-height:160px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;padding:8px 10px;font-size:11.5px;background:var(--vscode-textCodeBlock-background,var(--vscode-editor-background));border:1px solid var(--tf-border);border-radius:6px}
    @keyframes tfspin{to{transform:rotate(360deg)}}
    .passport-stats{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 0}
    .passport-stats>*{min-width:0}
    .passport-table{width:100%;border-collapse:collapse;margin:8px 0 4px;font-size:12px}
    .passport-table th{text-align:left;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--tf-muted);padding:6px 12px;border-bottom:1px solid var(--tf-border)}
    .passport-table td{padding:7px 12px;border-bottom:1px solid var(--tf-border);vertical-align:top}
    .passport-table tr:last-child td{border-bottom:none}
    .passport-path{font-family:var(--vscode-editor-font-family);overflow-wrap:anywhere}
    .passport-notes{color:var(--tf-muted)}
    .passport-flag{display:block;margin-top:3px}
    .passport-flag.high{color:var(--vx-danger)}
    .passport-flag.medium{color:var(--vx-warning)}
    .num-add{color:var(--vx-success)}
    .num-del{color:var(--vx-danger)}
    #probe-row{margin:0 0 12px;padding:10px 12px;border:1px solid var(--tf-border);border-radius:var(--tf-radius);background:var(--tf-card)}
    #probe-row[hidden]{display:none}
    #probe{display:block;width:100%;margin:0 0 6px;padding:6px 10px;color:var(--vscode-input-foreground);background:var(--vscode-input-background);border:1px solid var(--vscode-input-border,var(--tf-border));border-radius:6px;font-family:var(--vscode-editor-font-family);font-size:12px}
    #probe:focus{border-color:var(--vscode-focusBorder);outline:none}
    .field-hint{margin:0 0 10px;color:var(--tf-muted);font-size:11.5px}
    #probe-row .toolbar{margin-bottom:0}
    .card-note{margin:0;padding:8px 12px;color:var(--tf-muted);font-size:12px;border-bottom:1px solid var(--tf-border)}
    .future-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:10px 12px}
    .future-grid>*{min-width:0}
    .future-card{min-width:0;padding:10px 12px;border:1px solid var(--vx-line);border-radius:12px;background:var(--vscode-editor-background)}
    .future-card>*{min-width:0}
    .future-title{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:6px;font-weight:600}
    .future-letter{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid var(--vx-line);border-radius:5px;font-size:11px;font-weight:700;color:var(--vx-violet-text);background:var(--vx-raised)}
    .future-text{margin:0 0 6px;overflow-wrap:anywhere}
    .future-tradeoff{margin:0 0 8px;color:var(--tf-muted);font-size:12px;overflow-wrap:anywhere}
    .future-label{display:block;margin-top:4px;color:var(--tf-muted);font-size:11.5px;overflow-wrap:anywhere}
    .future-error{display:block;margin-top:4px;color:var(--vx-danger);font-size:11.5px;overflow-wrap:anywhere}
    .compare-scroll{overflow-x:auto}
    .compare-table{width:100%;border-collapse:collapse;font-size:12px}
    .compare-table th,.compare-table td{padding:7px 12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--tf-border);overflow-wrap:anywhere}
    .compare-table th{font-size:11px;font-weight:600;color:var(--tf-muted)}
    .compare-table tr:last-child td{border-bottom:none}
    .compare-table td.better{font-weight:600;color:var(--vx-success);background:color-mix(in srgb,var(--vx-success) 12%,var(--vscode-editor-background))}
    .compare-actions{display:flex;flex-wrap:wrap;gap:6px}
    .probe-output{margin:0;padding:8px 12px;max-height:180px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font-family:var(--vscode-editor-font-family);font-size:11.5px;border-top:1px solid var(--tf-border)}
    .future-files{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px}
    .future-files .file-nav{width:auto}
    .future-diff{border-top:1px solid var(--tf-border);overflow:auto;max-height:520px}
    .future-diff .review-header{position:static}
    .regret-card{border:1px solid var(--vx-line);border-radius:12px}
    .regret-heading{padding:10px 12px 0;font-weight:600}
    .regret-list{margin:4px 0 0;padding:0 12px 4px 30px}
    .regret-list li{overflow-wrap:anywhere}
    @media(max-width:640px){.review-layout{grid-template-columns:1fr}.review-heading{align-items:flex-start;flex-wrap:wrap}.future-grid{grid-template-columns:1fr}}
    @media(prefers-reduced-motion:reduce){.step-icon.run{animation:none}}
    [hidden]{display:none!important}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .brand{display:flex;align-items:center;gap:12px;margin-bottom:14px}
    .logo{flex:none;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;color:var(--vx-violet)}
    .brand-text{display:flex;flex:1 1 0;flex-direction:column;min-width:0}
    .brand-name{font-size:18px;font-weight:600;line-height:1.2}
    .brand-tagline{color:var(--vscode-descriptionForeground);font-size:12px}
    .platform-pill{flex:none;padding:2px 9px;border:1px solid var(--tf-border);border-radius:999px;color:var(--tf-muted);font-size:10.5px;white-space:nowrap}
    .task-box{border:1px solid var(--vx-line);border-radius:12px;background:var(--vscode-input-background);overflow:hidden;transition:border-color .12s}
    .task-box{position:relative}
    .mention-menu{position:absolute;z-index:4;left:8px;right:8px;bottom:46px;max-height:220px;overflow:auto;padding:4px;border:1px solid var(--vx-line);border-radius:8px;background:var(--vscode-editor-background)}
    .mention-option{display:flex;align-items:flex-start;gap:8px;width:100%;min-width:0;padding:6px 8px;text-align:left;border:none;border-radius:6px;background:transparent}
    .mention-option:hover,.mention-option:focus{background:var(--vx-raised)}
    .mention-option>*{min-width:0}
    .mention-name{font-size:12px;font-weight:600;overflow-wrap:anywhere}
    .mention-meta{display:block;color:var(--vscode-descriptionForeground);font-size:11px;overflow-wrap:anywhere}
    .task-box:focus-within{border-color:var(--vx-violet)}
    .task-box textarea{min-height:96px;margin:0;padding:12px 14px 6px;border:none;border-radius:0;background:transparent;resize:vertical}
    .task-box textarea:focus,.task-box textarea:focus-visible{border:none;outline:none}
    .task-footer{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:6px 8px 8px 10px}
    .chips{display:flex;flex:1 1 180px;flex-wrap:wrap;gap:6px;min-width:0}
    button.chip{padding:4px 10px;border:1px solid var(--vx-line);border-radius:6px;color:var(--vscode-foreground);background:transparent;font-size:11.5px}
    button.chip:hover:not(:disabled),button.chip[aria-expanded="true"]{border-color:var(--vx-line);background:var(--vx-raised)}
    .task-send{display:flex;gap:6px;margin-left:auto}
    #submit{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;font-weight:600}
    #probe-row{margin-top:10px}
    #apply:disabled{color:var(--vscode-foreground);background:transparent;border:1px solid var(--vx-line)}
    .mode-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:12px 0}
    .mode-list>*{min-width:0}
    button.mode{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;min-width:0;padding:7px 6px;text-align:center;color:var(--vscode-foreground);background:var(--tf-card);border:1px solid var(--vx-line);border-radius:12px}
    button.mode:hover,button.mode[aria-pressed="true"]{background:var(--vx-raised)}
    button.mode[aria-pressed="true"] .mode-icon{color:var(--vx-violet-text)}
    .mode-icon{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;color:var(--vscode-descriptionForeground);font-size:16px;line-height:16px;flex:none}
    .recent-runs{margin:8px 0 12px;color:var(--tf-muted);font-size:12px}
    .recent-runs h2{margin:10px 0 4px;font-size:13px;color:var(--vscode-foreground)}
    .recent-run-list{display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none}
    .recent-run{min-width:0;padding:6px 8px;border:1px solid var(--vx-line);border-radius:8px;overflow-wrap:anywhere}
    .how-it-works{margin:12px 0 0}
    .how-it-works h2{margin:0 0 12px;font-size:13px;font-weight:600;color:var(--vscode-foreground)}
    .how-row{display:flex;align-items:flex-start;gap:10px}
    .how-row+.how-row{margin-top:12px}
    .how-row>*{min-width:0}
    .how-number{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:none;border:1px solid var(--vx-line);border-radius:50%;color:var(--vx-violet-text);font-size:11px;line-height:20px}
    .how-copy{display:flex;flex-direction:column;min-width:0}
    .how-title{font-size:13px;font-weight:600;line-height:20px}
    .how-description{color:var(--vscode-descriptionForeground);font-size:12px;line-height:18px;overflow-wrap:anywhere}
    .mode-text{display:flex;flex-direction:column;min-width:0}
    .mode-name{font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .mode-sub{display:none}
    .new-badge{padding:1px 6px;border:1px solid var(--vx-line);border-radius:999px;color:var(--vx-violet-text);background:var(--vx-raised);font-size:10px;font-weight:700}
    .stepper{margin:12px 0;padding:10px 12px;border:1px solid var(--vx-line);border-radius:12px;background:var(--tf-card)}
    .stepper-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
    .progress-track{height:5px;margin-bottom:8px;border-radius:999px;background:var(--tf-border);overflow:hidden}
    .progress-fill{height:100%;border-radius:999px;background:var(--vx-violet);transition:width .3s ease}
    .progress-fill.running{background:var(--vx-violet-text)}
    .progress-fill.failed{background:var(--tf-bad)}
    .step-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:2px 12px;margin:0;padding:0;list-style:none}
    .run-step{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:6px;padding:3px 0;color:var(--vscode-descriptionForeground);font-size:12px}
    .run-step>*{min-width:0}
    .run-step.active{color:var(--vx-violet-text);font-weight:600}
    .run-step.done{color:var(--vscode-foreground)}
    .run-step-icon{text-align:center;font-weight:700}
    .run-step.done .run-step-icon{color:var(--vx-success)}
    .run-step.failed .run-step-icon{color:var(--vx-danger)}
    .run-step-icon{position:relative;width:14px;height:14px;justify-self:center;font-size:0}
    .run-step.pending .run-step-icon::before,.run-step.skipped .run-step-icon::before{content:"";position:absolute;inset:2px;border:1px solid var(--vscode-descriptionForeground);border-radius:50%}
    .run-step.active .run-step-icon::before{content:"";position:absolute;inset:1px;border:2px solid var(--vx-violet-text);border-right-color:transparent;border-radius:50%;animation:tfspin 1s linear infinite}
    .run-step.done .run-step-icon::before{content:"";position:absolute;left:3px;top:2px;width:7px;height:4px;border-left:2px solid var(--vx-success);border-bottom:2px solid var(--vx-success);transform:rotate(-45deg)}
    .run-step.failed .run-step-icon::before{content:"!";position:absolute;inset:0;color:var(--vx-danger);font-size:12px;font-weight:700;text-align:center}
    .run-step-time{color:var(--tf-muted);font-size:11px;font-weight:400;font-variant-numeric:tabular-nums}
    .dash-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:12px 0}
    .dash-grid>*{min-width:0}
    .mini-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:0 8px;min-width:0;padding:9px 12px;border:1px solid var(--vx-line);border-radius:12px;background:var(--tf-card)}
    .mini-card>*{min-width:0}
    .mini-label{grid-column:1/-1;color:var(--tf-muted);font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase}
    .mini-value{min-width:0;overflow-wrap:anywhere;font-weight:600}
    .context-budget-card{display:block}
    #context-summary{display:block;min-width:0;overflow-wrap:anywhere}
    #context-progress{width:100%;min-width:0}
    .mini-note{grid-column:1/-1;color:var(--tf-muted);font-size:11.5px;overflow-wrap:anywhere}
    .mini-card.warning .mini-note{color:var(--tf-warn)}
    button.link-button{padding:0 4px;color:var(--vx-violet-text);background:transparent;border:none}
    button.link-button:hover:not(:disabled){background:transparent;text-decoration:underline}
    .verify-hero{display:flex;align-items:center;gap:8px;padding:12px}
    .verify-hero>*{min-width:0}
    .verify-mark{display:inline-flex;align-items:center;flex:none}
    .verify-mark::before{content:"";width:6px;height:6px;flex:none;margin-right:6px;border-radius:50%;background:currentColor}
    .verify-title{display:block;font-size:13px;font-weight:600}
    .verify-card.passed .verify-title{color:var(--vx-success)}
    .verify-card.failed .verify-title{color:var(--vx-danger)}
    .verify-sub{display:block;color:var(--tf-muted);font-size:12px;overflow-wrap:anywhere}
    .card-details{border-top:1px solid var(--tf-border)}
    .card-details>summary{cursor:pointer;padding:7px 12px;color:var(--tf-muted);font-size:12px}
    .passport-stats{padding-bottom:10px}
    .passport-scroll{overflow-x:auto}
    .card-empty{margin:0;padding:10px 12px;color:var(--tf-muted);font-size:12px}
    .future-head-risk{margin-left:auto}
    .evidence-list{display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 10px;margin:8px 0;padding:8px 0 0;border-top:1px dashed var(--tf-border);font-size:12px}
    .evidence-list dt{color:var(--tf-muted)}
    .evidence-list dd{margin:0;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
    .evidence-list dd.good{color:var(--tf-ok)}
    .evidence-list dd.bad{color:var(--tf-bad)}
    .future-card .compare-actions{margin-top:8px}
    .future-card .compare-actions button{flex:1 1 auto}
    .history-body{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px}
    .history-files{min-width:0;color:var(--tf-muted);font-size:12px;overflow-wrap:anywhere}
    .status-block{margin:12px 0;padding:10px 12px;border:1px solid var(--vx-line);border-radius:12px;background:var(--tf-card)}
    .connection-row,.status-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .connection-row{font-size:12px;overflow-wrap:anywhere}
    .connection-dot{display:inline-block;width:8px;height:8px;min-width:8px;min-height:8px;margin-right:8px;border-radius:50%;background:var(--vscode-descriptionForeground);flex:none}
    .connection-dot.connected{background:var(--vx-success)}
    .connection-dot.disconnected{background:var(--vx-danger)}
    .model-chain{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin:8px 0;color:var(--tf-muted);font-size:11px}
    .model-chip{padding:2px 7px;border:1px solid var(--vx-line);border-radius:999px}
    .model-chip.active{border-color:var(--tf-accent);background:var(--tf-tint);color:var(--vscode-foreground);font-weight:600}
    .fallback-label{font-size:10px}
    .status-actions{margin-top:8px}
    .status-actions button{height:26px;padding:4px 10px;font-size:12px}
    .status-actions #cancel{color:#fff;background:var(--vx-danger);border-color:transparent}
    .status-actions #cancel:hover{filter:brightness(.9)}
    .review-actions{flex-wrap:wrap}
    .review-heading{flex-wrap:wrap}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
    .narrow-only{display:none}
    .file-row{display:flex;flex-direction:column;gap:4px}
    .file-row>*{min-width:0}
    .file-row-actions,.future-file-row,.compare-narrow-row{flex-wrap:wrap;align-items:center;gap:6px}
    .file-row-actions>*,.future-file-row>*,.compare-narrow-row>*{min-width:0}
    .compare-narrow{flex-direction:column;gap:8px;padding:10px 12px;border-top:1px solid var(--tf-border)}
    .compare-narrow-row{display:flex}
    .future-file-row{display:flex;width:100%}
    .future-file-row .file-nav{flex:1 1 140px}
    @media(max-width:560px){
      body{padding:12px 12px 24px}
      .wide-only{display:none!important}
      .narrow-only{display:flex}
      .review-layout{display:block}
      .review-actions{flex-wrap:wrap}
      .toolbar button{flex:1 1 auto}
      .passport-table th:nth-child(3),.passport-table td:nth-child(3){display:none}
      .passport-table th,.passport-table td{padding:6px 8px}
    }
    @media(max-width:480px){.dash-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header class="brand">
    <span class="logo" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="var(--vx-raised)"/><path d="M15 15 L26 15 L32 34 L39 15 L49 15 L37.5 38 L43 38 L27 54 L30.5 41 L25 41 Z" fill="#6E56CF"/><circle cx="48" cy="48" r="4.5" fill="#D4FF4F"/></svg></span>
    <span class="brand-text"><span class="brand-name">Voltix</span><span class="brand-tagline">Proof before apply.</span></span>
    <span class="platform-pill">runs on TrueForge</span>
  </header>
  <section class="status-block" aria-label="TrueForge connection and session">
    <div class="connection-row" title="Checking TrueForge connection">
      <span id="connection-dot" class="connection-dot" title="Checking"></span>
      <span id="connection-label">TrueForge · checking connection…</span>
      <span id="header-model" class="model-chip" title="Model fallback chain">Model</span>
    </div>
    <div class="status-actions">
      <button id="cancel" type="button" hidden>Stop</button>
      <button id="undo-header" class="secondary" type="button" disabled>Undo last change</button>
      <button id="open-session" class="secondary" type="button" disabled>Open TrueForge session</button>
    </div>
  </section>
  <form id="prompt-form">
    <div class="task-box">
      <label for="input" class="sr-only">Describe a task</label>
      <textarea id="input" placeholder="Ask for a change. @file to pin context. Enter to send, Shift+Enter for a new line." rows="4"></textarea>
      <div id="mention-menu" class="mention-menu" role="listbox" hidden></div>
      <div class="task-footer">
        <div class="chips">
          <button id="explore" class="chip" type="button" aria-expanded="false" aria-controls="probe-row">Explore futures</button>
          <button id="show-risks" class="chip" type="button">Show risks of this change</button>
        </div>
        <div class="task-send">
          <button id="submit" type="submit">Send</button>
        </div>
      </div>
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
  <nav class="mode-list" aria-label="Voltix modes">
    <button class="mode" type="button" data-action="mode-agent" aria-pressed="true" title="Plan, execute and verify"><span id="mode-icon-agent" class="mode-icon" aria-hidden="true"></span><span class="mode-name">Agent</span></button>
    <button class="mode" type="button" data-action="mode-futures" aria-pressed="false" title="Build and compare two designs"><span id="mode-icon-futures" class="mode-icon" aria-hidden="true"></span><span class="mode-name">Futures</span></button>
    <button class="mode" type="button" data-action="mode-impact" aria-pressed="false" title="Risk and blast radius"><span id="mode-icon-impact" class="mode-icon" aria-hidden="true"></span><span class="mode-name">Impact</span></button>
  </nav>
  <div id="recent-runs" class="recent-runs">
    <p>Describe a task. Voltix verifies changes before you apply them.</p>
  </div>
  <section id="stepper" class="stepper" aria-label="Run progress" hidden></section>
  <div id="status" role="status" aria-live="polite"></div>
  <div id="approval-banner" class="approval-banner" hidden>TrueForge is waiting for your review</div>
  <div id="error-area" aria-live="assertive"></div>
  <div id="result-area" aria-live="polite"></div>
  <div id="safety-proof-area" aria-live="polite"></div>
  <div id="futures-area"></div>
  <div class="dash-grid" id="context-card" hidden>
    <section class="mini-card context-budget-card" aria-label="Context budget">
      <span class="mini-label">Context budget</span>
      <span id="context-summary" class="mini-value">No files loaded yet</span>
      <div id="context-progress" class="context-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Context token budget">
        <div id="context-progress-fill" class="context-progress-fill"></div>
      </div>
      <div id="context-files" class="context-files">No selected files</div>
      <details id="context-left-details" class="context-left-details">
        <summary id="context-left-out">Left out (0)</summary>
        <div id="context-left-list"></div>
      </details>
      <div id="read-by-agent" class="read-by-agent"></div>
      <button id="context-view" class="link-button" type="button" hidden>View</button>
    </section>
  </div>
  <div id="verify-area" hidden></div>
  <div id="passport-area" hidden></div>
  <section id="history-section" class="card" aria-label="History" hidden></section>
  <details id="receipt" class="panel-section" hidden>
    <summary>Context Receipt <span id="receipt-count"></span></summary>
    <div id="receipt-body" class="receipt-body"><p class="receipt-summary">No context receipt for this request yet.</p></div>
  </details>
  <details id="activity-section" class="panel-section" hidden>
    <summary>Agent activity</summary>
    <ol id="activity-list" aria-live="polite"><li class="activity-item">Observed tool and turn events will appear here.</li></ol>
  </details>
  <section id="response-section" aria-labelledby="response-heading" hidden>
    <h2 id="response-heading">Agent response</h2>
    <div id="conversation" aria-live="polite"><div class="chat-empty">Your conversation will appear here.</div></div>
    <section id="changed-files-summary" class="changed-files-summary" hidden></section>
  </section>
  <section id="review-section" aria-labelledby="review-title" hidden>
    <div class="review-heading">
      <h2 id="review-title">Proposed files</h2>
      <span id="review-counts">No files to review</span>
      <div class="review-actions" aria-label="Review all files">
        <button id="accept-all" class="secondary" type="button" disabled>Accept All</button>
        <button id="apply" type="button" disabled>Apply Accepted</button>
        <button id="discard" class="danger" type="button">Discard All</button>
        <button id="open-editor" class="secondary narrow-only" type="button" title="Review individual hunks in a wide editor tab">Open in Editor</button>
      </div>
    </div>
    <div class="review-layout">
      <nav id="file-list" aria-label="Proposed files"></nav>
      <section id="review-detail" class="wide-only" aria-live="polite"></section>
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
      runStarted: false,
      applying: false,
      lastSubmittedText: '',
      modelChain: [],
      activeModel: '',
      recentRuns: [],
      pendingApproval: null,
      readByAgent: [],
      sessionId: '',
      safetyProofs: [],
      messages: [],
      activeResponseIndex: -1
    };
    const input = document.getElementById('input');
    const mentionMenu = document.getElementById('mention-menu');
    const conversation = document.getElementById('conversation');
    const changedFilesSummary = document.getElementById('changed-files-summary');
    const fileList = document.getElementById('file-list');
    const reviewDetail = document.getElementById('review-detail');
    const reviewCounts = document.getElementById('review-counts');
    const status = document.getElementById('status');
    const errorArea = document.getElementById('error-area');
    const resultArea = document.getElementById('result-area');
    const safetyProofArea = document.getElementById('safety-proof-area');
    const approvalBanner = document.getElementById('approval-banner');
    const receiptBody = document.getElementById('receipt-body');
    const receiptCount = document.getElementById('receipt-count');
    const activityList = document.getElementById('activity-list');
    const submitButton = document.getElementById('submit');
    const cancelButton = document.getElementById('cancel');
    const undoHeaderButton = document.getElementById('undo-header');
    const openSessionButton = document.getElementById('open-session');
    const connectionDot = document.getElementById('connection-dot');
    const connectionLabel = document.getElementById('connection-label');
    const applyButton = document.getElementById('apply');
    const acceptAllButton = document.getElementById('accept-all');
    const discardButton = document.getElementById('discard');
    const openEditorButton = document.getElementById('open-editor');
    const headerModel = document.getElementById('header-model');
    const contextCard = document.getElementById('context-card');
    const contextSummary = document.getElementById('context-summary');
    const contextProgress = document.getElementById('context-progress');
    const contextProgressFill = document.getElementById('context-progress-fill');
    const contextFiles = document.getElementById('context-files');
    const contextLeftOut = document.getElementById('context-left-out');
    const contextLeftList = document.getElementById('context-left-list');
    const contextLeftDetails = document.getElementById('context-left-details');
    const readByAgent = document.getElementById('read-by-agent');
    const contextView = document.getElementById('context-view');
    const receiptSection = document.getElementById('receipt');
    const activitySection = document.getElementById('activity-section');
    const stepper = document.getElementById('stepper');
    const historySection = document.getElementById('history-section');
    const verifyArea = document.getElementById('verify-area');
    const passportArea = document.getElementById('passport-area');
    const responseSection = document.getElementById('response-section');
    const reviewSection = document.getElementById('review-section');
    const exploreButton = document.getElementById('explore');
    const exploreStartButton = document.getElementById('explore-start');
    const exploreBackButton = document.getElementById('explore-back');
    const probeRow = document.getElementById('probe-row');
    const probeInput = document.getElementById('probe');
    const futuresArea = document.getElementById('futures-area');
    state.verifyEvents = [];
    state.passport = null;
    state.futures = emptyFutures();
    state.history = { canUndo: false, files: [] };
    state.run = null;
    state.runTimer = null;
    state.replaying = false;
    updateEmptyState();

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

    function reveal(element) {
      if (element && element.scrollIntoView) element.scrollIntoView({ block: 'start' });
    }

    function stopRunTimer() {
      if (state.runTimer) clearInterval(state.runTimer);
      state.runTimer = null;
    }

    function startStepper(mode) {
      const defs = [['read', 'Reading code'], ['plan', 'Planning'], ['implement', 'Implementing'], ['verify', 'Verifying in sandbox']];
      if (mode === 'futures') defs.push(['compare', 'Comparing futures']);
      else defs.push(['review', 'Waiting for review'], ['applied', 'Applied']);
      defs.push(['ready', mode === 'futures' ? 'Ready to choose' : 'Finished']);
      stopRunTimer();
      state.run = {
        mode,
        finished: false,
        outcome: null,
        current: -1,
        verifyOutcome: null,
        results: 0,
        files: new Map(),
        appliedFiles: new Set(),
        toolNames: new Map(),
        steps: defs.map(def => ({ key: def[0], label: def[1], status: 'pending', elapsed: 0, startedAt: null, visited: false, replayed: false })),
      };
      setRunStep('read');
      if (!state.replaying) state.runTimer = setInterval(renderStepper, 1000);
    }

    function pauseActiveStep(now) {
      state.run.steps.forEach(step => {
        if (step.startedAt !== null) {
          step.elapsed += now - step.startedAt;
          step.startedAt = null;
        }
      });
    }

    function setRunStep(key) {
      const run = state.run;
      if (!run || run.finished) return;
      if (run.appliedFiles.size && key !== 'applied') return;
      const index = run.steps.findIndex(step => step.key === key);
      if (index < 0 || index === run.current) return;
      const now = Date.now();
      pauseActiveStep(now);
      run.steps.forEach((step, stepIndex) => {
        if (stepIndex < index) step.status = step.visited ? 'done' : 'skipped';
        else if (stepIndex > index) step.status = 'pending';
      });
      const step = run.steps[index];
      step.status = 'active';
      step.visited = true;
      step.startedAt = now;
      if (state.replaying) step.replayed = true;
      run.current = index;
      renderStepper();
    }

    function finishRun(outcome) {
      const run = state.run;
      if (!run || run.finished) return;
      pauseActiveStep(Date.now());
      const needsReview = outcome === 'ready' && run.mode === 'agent' && !run.appliedFiles.size && run.files.size > 0;
      run.finished = true;
      run.outcome = needsReview ? 'review' : outcome;
      stopRunTimer();
      if (needsReview) {
        const reviewIndex = run.steps.findIndex(step => step.key === 'review');
        run.steps.forEach((step, index) => {
          if (index < reviewIndex) step.status = step.visited ? 'done' : 'skipped';
          else step.status = index === reviewIndex ? 'active' : 'pending';
        });
        run.steps[reviewIndex].visited = true;
        run.current = reviewIndex;
        applyVerifyOutcome(run);
      } else if (outcome === 'ready') {
        run.steps.forEach(step => { step.status = step.visited ? 'done' : 'skipped'; });
        const last = run.steps[run.steps.length - 1];
        last.status = 'done';
        last.visited = true;
        if (run.mode === 'agent') last.label = finishedLabel(run);
        applyVerifyOutcome(run);
      } else if (run.current >= 0 && run.steps[run.current].key !== 'applied') {
        run.steps[run.current].status = 'failed';
      }
      renderStepper();
    }

    function applyVerifyOutcome(run) {
      const verify = run.steps.find(step => step.key === 'verify');
      if (run.verifyOutcome === 'failed') verify.status = 'failed';
      else if (run.verifyOutcome === 'skipped') verify.status = 'skipped';
    }

    function finishedLabel(run) {
      const count = run.appliedFiles.size || new Set(run.files.values()).size;
      if (!count) return 'Finished, no changes';
      return 'Finished · ' + count + (count === 1 ? ' file' : ' files') + ' changed';
    }

    function markApplied(run, paths) {
      if (run.mode !== 'agent') return;
      const runPaths = new Set(run.files.values());
      const appliedHere = paths.filter(path => runPaths.has(path));
      if (!appliedHere.length) return;
      appliedHere.forEach(path => run.appliedFiles.add(path));
      const appliedStep = run.steps.find(step => step.key === 'applied');
      if (run.outcome === 'review') {
        appliedStep.visited = true;
        run.finished = false;
        finishRun('ready');
      } else if (run.finished) {
        if (run.outcome === 'ready') run.steps[run.steps.length - 1].label = finishedLabel(run);
        renderStepper();
      } else {
        setRunStep('applied');
        pauseActiveStep(Date.now());
        appliedStep.status = 'done';
        renderStepper();
      }
    }

    /** Deferred tools arrive wrapped in call_tool; the timeline needs the real tool name. */
    function runToolName(message) {
      const name = String(message.name || '');
      if (name !== 'call_tool') return name;
      const preview = String(message.argsPreview || '');
      const match = preview.match(/"tool_name"[ ]*:[ ]*"([^"]+)"/) || preview.match(/"(?:name|tool)"[ ]*:[ ]*"([^"]+)"/);
      return match ? match[1] : name;
    }

    function trackRun(message) {
      const run = state.run;
      if (!run) return;
      if (message.type === 'apply_result') {
        markApplied(run, Array.isArray(message.applied) ? message.applied : []);
        return;
      }
      if (run.finished) return;
      const current = run.current >= 0 ? run.steps[run.current].key : '';
      const readTools = /read_file|search_workspace|list_workspace_files/;
      if (message.type === 'tool_start') {
        const name = runToolName(message);
        run.toolNames.set(message.id, name);
        if (/edit_file|propose_file_change/.test(name)) setRunStep('implement');
        else if (/verify_changes/.test(name)) setRunStep('verify');
        else if (readTools.test(name) && (current === 'read' || current === 'plan')) setRunStep('read');
      } else if (message.type === 'tool_done') {
        const name = run.toolNames.get(message.id) || String(message.summary || message.name || '').split(' ')[0];
        if (/edit_file|propose_file_change/.test(name)) setRunStep('implement');
        else if (current === 'read' && readTools.test(name)) setRunStep('plan');
      } else if (message.type === 'pending_change' && message.change && run.mode === 'agent') {
        run.files.set(message.change.id, message.change.path);
        setRunStep('implement');
      } else if (message.type === 'change_removed') {
        run.files.delete(message.changeId);
      } else if (message.type === 'model_info' && message.fallbackFrom) {
        run.files.clear();
      } else if (message.type === 'approval_required') {
        setRunStep('review');
      } else if (message.type === 'text_delta') {
        if (current === 'read' && message.content) setRunStep('plan');
      } else if (message.type === 'verification') {
        if (message.phase === 'running' || message.phase === 'fixing') setRunStep('verify');
        if (message.phase === 'passed' || message.phase === 'failed' || message.phase === 'skipped') run.verifyOutcome = message.phase;
      } else if (message.type === 'futures_plan') {
        setRunStep('implement');
      } else if (message.type === 'future_progress') {
        if (message.phase === 'implementing') setRunStep('implement');
        else if (['verifying', 'fixing', 'probing'].indexOf(message.phase) !== -1) setRunStep('verify');
      } else if (message.type === 'future_result') {
        run.results++;
        if (run.results >= 2) setRunStep('compare');
      } else if (message.type === 'busy' && message.busy === false) {
        finishRun('ready');
      } else if (message.type === 'turn_done' && message.status !== 'done') {
        finishRun(message.status === 'cancelled' ? 'cancelled' : 'failed');
      } else if (message.type === 'error') {
        finishRun('failed');
      }
    }

    function formatDuration(ms) {
      if (ms < 1000) return '<1s';
      const seconds = Math.round(ms / 1000);
      if (seconds < 60) return seconds + 's';
      const rest = seconds % 60;
      return Math.floor(seconds / 60) + 'm ' + (rest < 10 ? '0' : '') + rest + 's';
    }

    function renderStepper() {
      clear(stepper);
      const run = state.run;
      stepper.hidden = !run;
      if (!run) return;
      const now = Date.now();
      const head = makeElement('div', 'stepper-head');
      head.appendChild(makeElement('span', 'card-title', run.mode === 'futures' ? 'Futures run' : 'Agent run'));
      if (!run.finished) head.appendChild(makeElement('span', 'pill info', 'Running'));
      else if (run.outcome === 'ready') head.appendChild(makeElement('span', 'pill ok', 'Complete'));
      else if (run.outcome === 'review') head.appendChild(makeElement('span', 'pill info', 'Needs review'));
      else head.appendChild(makeElement('span', 'pill ' + (run.outcome === 'cancelled' ? 'muted' : 'bad'), run.outcome === 'cancelled' ? 'Cancelled' : 'Failed'));
      stepper.appendChild(head);
      const finishedSteps = run.steps.filter(step => step.status === 'done' || step.status === 'skipped').length;
      const percent = run.outcome === 'ready' ? 100 : Math.round(((finishedSteps + (run.finished ? 0 : 0.5)) / run.steps.length) * 100);
      const track = makeElement('div', 'progress-track');
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
      track.setAttribute('aria-valuenow', String(percent));
      track.setAttribute('aria-label', 'Run progress');
      const fill = makeElement('div', 'progress-fill' + (!run.finished ? ' running' : run.outcome === 'ready' || run.outcome === 'review' ? '' : ' failed'));
      fill.style.width = percent + '%';
      track.appendChild(fill);
      stepper.appendChild(track);
      const list = makeElement('ol', 'step-list');
      run.steps.forEach(step => {
        const item = makeElement('li', 'run-step ' + step.status);
        item.appendChild(makeElement('span', 'run-step-icon', ''));
        item.appendChild(makeElement('span', '', step.label));
        const elapsed = step.elapsed + (step.startedAt !== null ? now - step.startedAt : 0);
        const showTime = step.visited && !step.replayed && step.key !== 'ready' && elapsed > 0;
        item.appendChild(makeElement('span', 'run-step-time', showTime ? formatDuration(elapsed) : ''));
        list.appendChild(item);
      });
      stepper.appendChild(list);
    }

    function renderHistory() {
      clear(historySection);
      const head = makeElement('div', 'card-head');
      head.appendChild(makeElement('span', 'card-title', 'History'));
      historySection.appendChild(head);
      const body = makeElement('div', 'history-body');
      const files = state.history.files;
      body.appendChild(makeElement('span', 'history-files', state.history.canUndo
        ? 'Last apply: ' + files.join(', ')
        : 'Nothing to undo yet. Applied changes appear here.'));
      body.appendChild(actionButton('Undo last apply', 'undo-last', 'secondary', {}, !state.history.canUndo));
      historySection.appendChild(body);
    }

    function showImpact() {
      if (state.futures.strategies.length && !state.futures.chosen) {
        reveal(futuresArea);
        status.textContent = 'Each future shows its own risk and evidence on its card.';
        return;
      }
      reveal(passportArea);
      if (!state.passport) status.textContent = 'No change to assess yet. Run a task, then Impact Radar shows its risk and blast radius.';
    }

    function phaseChip(phase) {
      const names = { planning: 'Waiting', implementing: 'Implementing', verifying: 'Verifying', fixing: 'Fixing', probing: 'Probing', done: 'Done', failed: 'Failed' };
      const cls = phase === 'done' ? 'ok' : phase === 'failed' ? 'bad' : phase === 'planning' ? 'muted' : 'info';
      return makeElement('span', 'pill ' + cls, names[phase] || 'Waiting');
    }

    function evidenceRow(list, label, value, tone) {
      list.appendChild(makeElement('dt', '', label));
      list.appendChild(makeElement('dd', tone || '', value));
    }

    function renderStrategy(strategy) {
      const futures = state.futures;
      const isChosen = futures.chosen && futures.chosen.futureId === strategy.id;
      const result = futures.results[strategy.id];
      const card = makeElement('article', 'future-card' + (isChosen ? ' chosen' : ''));
      const title = makeElement('div', 'future-title');
      title.appendChild(makeElement('span', 'future-letter', strategy.id));
      title.appendChild(makeElement('span', '', strategy.title));
      if (result && result.evidence.status === 'completed') {
        const risk = riskPill(result.evidence.risk);
        risk.classList.add('future-head-risk');
        title.appendChild(risk);
      }
      card.appendChild(title);
      card.appendChild(makeElement('p', 'future-text', strategy.approach));
      if (strategy.tradeoff) card.appendChild(makeElement('p', 'future-tradeoff', 'Trade-off: ' + strategy.tradeoff));
      const progress = futures.phases[strategy.id] || { phase: 'planning', label: 'Waiting' };
      card.appendChild(phaseChip(progress.phase));
      if (progress.phase === 'failed') card.appendChild(makeElement('span', 'future-error', progress.label));
      else if (progress.phase !== 'done' && progress.label) card.appendChild(makeElement('span', 'future-label', progress.label));
      if (result) {
        const item = result.evidence;
        const list = makeElement('dl', 'evidence-list');
        if (item.tests.ran) evidenceRow(list, 'Tests', (item.tests.passed ? 'Pass · ' : 'Fail · ') + item.tests.summary, item.tests.passed ? 'good' : 'bad');
        else evidenceRow(list, 'Tests', 'Not run');
        evidenceRow(list, 'Files', String(item.filesChanged.length));
        evidenceRow(list, 'Lines', '+' + item.added + ' / −' + item.removed);
        evidenceRow(list, 'Fix rounds', String(item.fixRounds));
        if (item.probe) evidenceRow(list, 'Probe', item.probe.timedOut ? 'Timed out' : item.probe.passed ? 'OK' : 'Failed (exit ' + item.probe.exitCode + ')', item.probe.passed ? 'good' : 'bad');
        else evidenceRow(list, 'Probe', 'Not run');
        evidenceRow(list, 'Time', formatDuration(item.durationMs));
        card.appendChild(list);
      }
      if (futures.rows) card.appendChild(futureActions(strategy.id));
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
        if (futures.chosen.futureId === id) actions.appendChild(makeElement('span', 'pill ok', 'Chosen'));
      } else {
        const choose = makeElement('button', 'primary', 'Choose this future');
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
      head.appendChild(makeElement('span', 'pill muted wide-only', 'Better value'));
      head.appendChild(actionButton('Compare in editor', 'open-compare', 'secondary narrow-only'));
      card.appendChild(head);
      const scroll = makeElement('div', 'compare-scroll wide-only');
      const table = makeElement('table', 'compare-table');
      const headRow = makeElement('tr');
      ['', 'Future A', 'Future B'].forEach(label => headRow.appendChild(makeElement('th', '', label)));
      table.appendChild(headRow);
      futures.rows.forEach(row => {
        const tr = makeElement('tr');
        tr.appendChild(makeElement('th', '', row.label));
        tr.appendChild(makeElement('td', row.better === 'A' ? 'better' : '', (row.better === 'A' ? 'Better · ' : '') + row.a));
        tr.appendChild(makeElement('td', row.better === 'B' ? 'better' : '', (row.better === 'B' ? 'Better · ' : '') + row.b));
        table.appendChild(tr);
      });
      scroll.appendChild(table);
      card.appendChild(scroll);
      ['A', 'B'].forEach(id => {
        const result = futures.results[id];
        if (!result || !result.evidence.probe) return;
        const details = makeElement('details', 'card-details');
        details.appendChild(makeElement('summary', '', 'Future ' + id + ' probe output: ' + result.evidence.probe.command));
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
        const fileRow = makeElement('div', 'future-file-row');
        fileRow.appendChild(button);
        const open = actionButton('Open diff', 'open-diff', 'secondary narrow-only', { changeId: change.id, futureId: futures.viewing });
        fileRow.appendChild(open);
        files.appendChild(fileRow);
      });
      card.appendChild(files);
      const change = result.changes[index];
      const container = makeElement('div', 'future-diff wide-only');
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
      // While futures are undecided, each card holds its own evidence; the single-run cards would mislead.
      const undecided = futures.strategies.length > 0 && !futures.chosen;
      verifyArea.hidden = undecided;
      passportArea.hidden = undecided;
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
      setFuturesMode(false);
      setBusy(true);
      status.textContent = 'Planning two different strategies...';
      vscode.postMessage({ type: 'explore_futures', text, probeCommand: probeInput.value });
      input.value = '';
    }

    function renderVerification() {
      clear(verifyArea);
      const events = state.verifyEvents;
      const last = events.length ? events[events.length - 1] : null;
      const phase = last ? last.phase : 'idle';
      const view = {
        idle: ['muted', 'NOT VERIFIED', 'Not verified yet', 'Tests run in a sandbox after the agent proposes changes.'],
        skipped: ['muted', 'NOT VERIFIED', 'Not verified', last && last.summary ? last.summary : 'No test command was available.'],
        running: ['info', 'VERIFYING', 'Verifying in sandbox', last ? last.summary : ''],
        fixing: ['info', 'FIXING', 'Agent is fixing failures', last ? last.summary : ''],
        passed: ['ok', 'VERIFIED', 'Verified', last ? last.summary : ''],
        failed: ['bad', 'FAILED', 'Tests failing', last ? last.summary : ''],
      }[phase];
      const card = makeElement('section', 'card verify-card ' + phase);
      card.setAttribute('aria-label', 'Verification');
      const hero = makeElement('div', 'verify-hero');
      hero.appendChild(makeElement('span', 'pill verify-mark ' + view[0], view[1]));
      const text = makeElement('div');
      text.appendChild(makeElement('span', 'verify-title', view[2]));
      text.appendChild(makeElement('span', 'verify-sub', view[3]));
      const fixes = events.filter(item => item.phase === 'fixing').length;
      if (fixes) text.appendChild(makeElement('span', 'verify-sub', fixes + ' automatic fix round' + (fixes > 1 ? 's' : '')));
      hero.appendChild(text);
      card.appendChild(hero);
      if (events.length) {
        const details = makeElement('details', 'card-details');
        if (phase === 'failed') details.open = true;
        details.appendChild(makeElement('summary', '', 'Verification details'));
        const steps = makeElement('ol', 'verify-steps');
        events.forEach((item, index) => {
          if (item.phase === 'running' && index < events.length - 1) return;
          const step = makeElement('li', 'verify-step');
          const iconClass = item.phase === 'passed' ? 'ok' : item.phase === 'failed' ? 'bad' :
            item.phase === 'fixing' || item.phase === 'running' ? 'run' : '';
          step.appendChild(makeElement('span', 'step-icon ' + iconClass, ''));
          const main = makeElement('div', 'step-main');
          const who = item.source === 'agent' ? 'Agent ran tests' : item.phase === 'fixing' ? 'Voltix sent failures back' : 'Voltix ran tests';
          main.appendChild(makeElement('span', 'step-text', who + ': ' + (item.summary || '')));
          if (item.command && item.phase !== 'fixing') {
            main.appendChild(makeElement('span', 'step-cmd', '$ ' + item.command + (item.durationMs ? '  ·  ' + (item.durationMs / 1000).toFixed(1) + 's' : '')));
          }
          if (item.phase === 'failed' && item.output && index === events.length - 1) {
            const output = makeElement('details');
            output.appendChild(makeElement('summary', 'step-cmd', 'Show test output'));
            output.appendChild(makeElement('pre', 'step-output', item.output));
            main.appendChild(output);
          }
          step.appendChild(main);
          steps.appendChild(step);
        });
        details.appendChild(steps);
        card.appendChild(details);
      }
      verifyArea.appendChild(card);
    }

    function riskPill(risk) {
      const cls = risk === 'high' ? 'bad' : risk === 'medium' ? 'warn' : 'ok';
      return makeElement('span', 'pill ' + cls, (risk || 'low').toUpperCase() + ' RISK');
    }

    function renderPassport() {
      clear(passportArea);
      const passport = state.passport;
      const card = makeElement('section', 'card');
      card.setAttribute('aria-label', 'Change Passport');
      const head = makeElement('div', 'card-head');
      head.appendChild(makeElement('span', 'card-title', 'Change passport'));
      if (!passport || !passport.files || !passport.files.length) {
        card.appendChild(head);
        card.appendChild(makeElement('p', 'card-empty', 'Risk, files and blast radius appear here after a run.'));
        passportArea.appendChild(card);
        return;
      }
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
          passport.verification.passed ? 'Verified: ' + passport.verification.summary : 'Failed: ' + passport.verification.summary));
      }
      card.appendChild(stats);
      const fileDetails = makeElement('details', 'card-details');
      fileDetails.appendChild(makeElement('summary', '', 'Show ' + totals.files + ' file' + (totals.files === 1 ? '' : 's')));
      const tableScroll = makeElement('div', 'passport-scroll');
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
        (file.flags || []).forEach(flag => notes.appendChild(makeElement('span', 'passport-flag ' + flag.level, flag.level.toUpperCase() + ' RISK: ' + flag.message)));
        row.appendChild(notes);
        table.appendChild(row);
      });
      tableScroll.appendChild(table);
      fileDetails.appendChild(tableScroll);
      card.appendChild(fileDetails);
      passportArea.appendChild(card);
    }

    function makeElement(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text !== undefined && text !== null) element.textContent = String(text);
      return element;
    }

    function svgIcon(pathD) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '14');
      svg.setAttribute('height', '14');
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.5');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathD);
      svg.appendChild(path);
      return svg;
    }

    document.getElementById('mode-icon-agent').appendChild(svgIcon('M3 3h2 M8 3h5 M3 8h2 M8 8h5 M3 13h2 M8 13h5 M2.5 3l1 1 2-2'));
    document.getElementById('mode-icon-futures').appendChild(svgIcon('M8 2v4 M8 6L4 10v3 M8 6l4 4v3'));
    document.getElementById('mode-icon-impact').appendChild(svgIcon('M2 9h3l2-5 3 9 2-4h2'));

    function actionButton(label, action, className, data, disabled) {
      const button = makeElement('button', className, label);
      button.type = 'button';
      button.dataset.action = action;
      Object.keys(data || {}).forEach(key => { button.dataset[key] = data[key]; });
      button.disabled = Boolean(disabled);
      return button;
    }

    function clear(element) {
      while (element.firstChild) element.removeChild(element.firstChild);
    }

    function renderReadByAgent() {
      clear(readByAgent);
      if (!state.readByAgent.length) return;
      readByAgent.appendChild(makeElement('span', 'read-by-agent-title', 'Read by agent'));
      state.readByAgent.slice(-8).forEach(entry => readByAgent.appendChild(makeElement('div', 'context-left-file', entry)));
    }

    function renderConversation() {
      clear(conversation);
      if (!state.messages.length) {
        conversation.appendChild(makeElement('div', 'chat-empty', 'Your conversation will appear here.'));
        return;
      }
      state.messages.forEach(message => {
        const bubble = makeElement('article', 'chat-message ' + message.role);
        bubble.appendChild(makeElement('div', 'chat-role', message.role === 'user' ? 'You' : 'Voltix'));
        bubble.appendChild(makeElement('div', 'chat-content', message.content || (message.role === 'assistant' ? 'Thinking…' : '')));
        conversation.appendChild(bubble);
      });
      conversation.scrollTop = conversation.scrollHeight;
    }

    function appendConversationMessage(role, content) {
      state.messages.push({ role, content });
      renderConversation();
    }

    function renderChangedFilesSummary() {
      clear(changedFilesSummary);
      const unique = new Map();
      state.changes.forEach(change => {
        if (!change.path) return;
        unique.set(change.path, change.reason || 'Proposed change');
      });
      const count = unique.size;
      changedFilesSummary.hidden = count === 0;
      if (!count) return;
      changedFilesSummary.appendChild(makeElement('span', 'changed-files-title', 'Files changed (' + count + ')'));
      const list = makeElement('ul', 'changed-files-list');
      unique.forEach((reason, file) => {
        list.appendChild(makeElement('li', 'changed-file-row', file + ' — ' + reason));
      });
      changedFilesSummary.appendChild(list);
    }

    function ensureAssistantResponse() {
      if (state.activeResponseIndex >= 0 && state.messages[state.activeResponseIndex]?.role === 'assistant') {
        return state.messages[state.activeResponseIndex];
      }
      state.messages.push({ role: 'assistant', content: '' });
      state.activeResponseIndex = state.messages.length - 1;
      return state.messages[state.activeResponseIndex];
    }


    function renderActivity() {
      clear(activityList);
      if (state.activities.length === 0) {
        activityList.appendChild(makeElement('li', 'activity-item', 'No tool or turn events have been observed yet.'));
        return;
      }
      state.activities.forEach(activity => {
        const item = makeElement('li', 'activity-item');
        item.appendChild(makeElement('div', 'activity-title', activity.summary || activity.name + ' → ' + activity.status));
        if (activity.argsPreview || activity.resultPreview) {
          const raw = makeElement('details', 'activity-raw');
          raw.appendChild(makeElement('summary', '', 'Raw preview'));
          if (activity.argsPreview) raw.appendChild(makeElement('pre', 'activity-preview', 'Arguments: ' + activity.argsPreview));
          if (activity.resultPreview) raw.appendChild(makeElement('pre', 'activity-preview', 'Result preview: ' + activity.resultPreview));
          item.appendChild(raw);
        }
        activityList.appendChild(item);
      });
    }

    function toolStartSummary(name, argsPreview) {
      let args = {};
      try { args = JSON.parse(argsPreview || '{}'); } catch (_) {}
      if (name === 'list_tools') return 'Discovered tools on voltix (deferred loading) → running';
      if (name === 'get_tool_info') {
        const toolName = args.tool_name || args.name || args.tool || 'workspace tool';
        return 'Loaded schema: ' + toolName + ' → running';
      }
      if (name === 'call_tool') {
        const innerName = args.tool_name || args.name || args.tool || 'workspace tool';
        const innerArgs = args.arguments && typeof args.arguments === 'object' ? args.arguments : args;
        if (innerName === 'search_workspace') return "search '" + String(innerArgs.query || '').replace(/\s+/g, ' ') + "' → running";
        if (innerName === 'read_file') {
          const start = Number(innerArgs.start_line) || 1;
          const end = Number(innerArgs.end_line) || start;
          return 'read ' + String(innerArgs.path || 'unknown file') + ' ' + start + '-' + end + ' → running';
        }
        if (innerName === 'list_workspace_files') return 'list workspace files → running';
        return innerName + ' → running';
      }
      const path = args.path ? ' ' + args.path : '';
      if (name === 'search_workspace') return name + " '" + String(args.query || '').replace(/\s+/g, ' ') + "' → running";
      return name + path + ' → running';
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
      cancelButton.hidden = !busy;
      if (busy) status.textContent = 'Request in progress...';
      updateReviewSummary();
      renderFutures();
    }

    function updateEmptyState() {
      contextCard.hidden = !state.runStarted;
      responseSection.hidden = !state.runStarted && state.messages.length === 0;
      activitySection.hidden = !state.runStarted && state.activities.length === 0;
      reviewSection.hidden = !state.runStarted && state.changes.length === 0;
      verifyArea.hidden = !state.runStarted;
      passportArea.hidden = !state.runStarted;
      const recentRuns = document.getElementById('recent-runs');
      if (recentRuns) {
        renderRecentRuns(state.recentRuns);
        recentRuns.hidden = state.runStarted;
      }
    }

    function renderRecentRuns(runs) {
      state.recentRuns = Array.isArray(runs) ? runs : [];
      const container = document.getElementById('recent-runs');
      if (!container) return;
      clear(container);
      container.appendChild(makeElement('p', '', 'Describe a task. Voltix verifies changes before you apply them.'));
      if (state.recentRuns.length) {
        container.appendChild(makeElement('h2', '', 'Recent runs'));
        const list = makeElement('ul', 'recent-run-list');
        state.recentRuns.slice(0, 5).forEach(run => list.appendChild(makeElement('li', 'recent-run', run)));
        container.appendChild(list);
      } else {
        const how = makeElement('section', 'how-it-works');
        how.appendChild(makeElement('h2', '', 'How it works'));
        [
          ['1', 'Plan on TrueForge', 'The agent reads only the files it needs and plans the change.'],
          ['2', 'Verify in a sandbox', 'Your tests run on a copy. Failures go back to the agent to fix.'],
          ['3', 'Apply with a Passport', 'See risks and blast radius, then accept hunk by hunk.']
        ].forEach(row => {
          const item = makeElement('div', 'how-row');
          item.appendChild(makeElement('span', 'how-number', row[0]));
          const copy = makeElement('div', 'how-copy');
          copy.appendChild(makeElement('span', 'how-title', row[1]));
          copy.appendChild(makeElement('span', 'how-description', row[2]));
          item.appendChild(copy);
          how.appendChild(item);
        });
        container.appendChild(how);
      }
      container.hidden = state.runStarted;
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
      acceptAllButton.hidden = state.changes.length === 0;
      applyButton.hidden = state.changes.length === 0;
      discardButton.hidden = state.changes.length === 0;
      discardButton.disabled = state.applying;
      reviewSection.hidden = !state.runStarted && state.changes.length === 0;
      if (openEditorButton) openEditorButton.hidden = state.changes.length === 0;
      renderFileList();
    }

    function renderFileList() {
      clear(fileList);
      if (state.changes.length === 0) {
        fileList.appendChild(makeElement('p', 'review-empty', 'No proposed files.'));
        renderSelectedChange();
        return;
      }
      state.changes.forEach(change => {
        const row = makeElement('div', 'file-row');
        const button = makeElement('button', 'file-nav');
        button.type = 'button';
        button.dataset.action = 'select-file';
        button.dataset.changeId = change.id;
        button.setAttribute('aria-current', change.id === state.selectedId ? 'true' : 'false');
        button.appendChild(makeElement('span', 'file-nav-path', change.path));
        button.appendChild(makeElement('span', 'file-nav-state', changeState(change)));
        row.appendChild(button);
        const locked = state.outcomes.get(change.id) === 'Applied' || state.applying;
        const actions = makeElement('div', 'file-row-actions narrow-only');
        actions.appendChild(actionButton('Accept', 'accept-file', 'secondary', { changeId: change.id }, locked));
        actions.appendChild(actionButton('Reject', 'reject-file', 'secondary', { changeId: change.id }, locked));
        actions.appendChild(actionButton('Open diff', 'open-diff', 'secondary', { changeId: change.id }, state.outcomes.get(change.id) === 'Applied'));
        row.appendChild(actions);
        fileList.appendChild(row);
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
        if (state.changes.length !== 0) {
          reviewDetail.appendChild(makeElement('div', 'review-empty', 'Select a file to review its complete changes.'));
        }
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
      const fileCount = new Set(items.map(item => item.path)).size;
      const totalTokens = Number(receipt.totalTokens) || 0;
      const budget = Number(receipt.budget) || 0;
      const searchedCount = Number(receipt.searchedCount) || 0;
      const percentage = budget > 0 ? Math.min(100, Math.round((totalTokens / budget) * 100)) : 0;
      if (fileCount === 0) {
        contextSummary.textContent = 'Budget ' + budget.toLocaleString() + ' tokens · used ' + totalTokens.toLocaleString();
        contextProgress.hidden = false;
        contextProgress.setAttribute('aria-valuenow', '0');
        contextProgressFill.style.width = '0%';
        contextView.hidden = true;
      } else {
        contextSummary.textContent = 'Budget ' + budget.toLocaleString() + ' tokens · used ' + totalTokens.toLocaleString();
        contextProgress.hidden = false;
        contextProgress.setAttribute('aria-valuenow', String(percentage));
        contextProgressFill.style.width = percentage + '%';
        contextView.hidden = false;
        contextView.disabled = false;
      }
      clear(contextFiles);
      if (items.length) {
        items.forEach(item => {
          const row = makeElement('div', 'context-file-row');
          const pinnedSymbol = Array.isArray(item.signals) && item.signals.includes('pinned_symbol');
          const pinnedFile = Array.isArray(item.signals) && item.signals.includes('explicit_mention');
          const reason = pinnedSymbol
            ? '@symbol pinned'
            : pinnedFile
              ? '@file pinned'
              : item.reason || 'low score ' + (Number(item.score || 0) > 1 ? (Number(item.score || 0) / 100).toFixed(2) : Number(item.score || 0).toFixed(2));
          row.appendChild(makeElement('span', 'context-file-name', (item.path || 'Unknown file')));
          row.appendChild(makeElement('span', 'context-file-meta',
            (item.tokenEstimate || 0).toLocaleString() + ' tokens · ' + reason));
          contextFiles.appendChild(row);
        });
      } else {
        contextFiles.appendChild(makeElement('span', 'context-file', 'No selected files'));
      }
      const excludedItems = Array.isArray(receipt.excludedItems) ? receipt.excludedItems : [];
      const excludedCount = Number(receipt.excluded) || 0;
      const excludedNames = excludedItems.slice(0, 3).map(item => item.path || 'Unknown file');
      contextLeftOut.textContent = 'Left out (' + excludedCount + ')';
      contextLeftDetails.hidden = excludedCount === 0;
      clear(contextLeftList);
      excludedItems.forEach(item => {
        const detail = item.path + ' · ' + (item.reason === 'context_budget' ? 'over budget' : item.reason || 'low score');
        contextLeftList.appendChild(makeElement('span', 'context-left-file', detail));
      });
      receiptCount.textContent = items.length ? '(' + items.length + ' selected)' : '(no files selected)';
      const summaryParts = [
        items.length + ' selected',
        excludedCount + ' matched candidates excluded by budget',
        totalTokens + ' of ' + budget + ' estimated tokens',
        'searched ' + searchedCount + ' files'
      ];
      receiptBody.appendChild(makeElement('p', 'receipt-summary', summaryParts.join(' | ')));
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

    function renderSafetyProof(message) {
      state.safetyProofs.push(message);
      clear(safetyProofArea);
      state.safetyProofs.forEach(proof => {
        const card = makeElement('div', 'result-banner safety-proof');
        const gitState = proof.error ? 'unavailable' : proof.clean ? 'clean' : 'not clean';
        let heading = '';
        if (proof.kind === 'stopped') {
          heading = proof.elapsedMs === undefined
            ? proof.cancelConfirmed === false ? 'Stop requested; cancellation not confirmed · ' : 'Stopped · '
            : 'Stopped ' + proof.elapsedMs + ' ms after you pressed Stop · ';
          heading += 'pending proposals dropped · nothing written to disk · git status: ' + gitState;
        } else if (proof.kind === 'failed') {
          heading = 'Failed turn · pending proposals dropped · nothing written to disk · git status: ' + gitState;
        } else {
          heading = 'Discarded pending proposals · nothing written to disk · git status: ' + gitState;
        }
        card.appendChild(makeElement('div', 'banner-heading', heading));
        if (proof.files && proof.files.length) appendPathList(card, 'Files reported by git status --porcelain', proof.files);
        if (proof.error) card.appendChild(makeElement('p', 'decision-note', 'Could not read git status: ' + proof.error));
        safetyProofArea.appendChild(card);
      });
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
      setBusy(true);
      vscode.postMessage({ type: 'submit', text: input.value });
      input.value = '';
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!state.busy) document.getElementById('prompt-form').requestSubmit();
      }
    });
    input.addEventListener('input', () => {
      const cursor = input.selectionStart;
      const before = input.value.slice(0, cursor);
      const match = before.match(/(?:^|\s)@([^\s]*)$/);
      if (!match) {
        mentionMenu.hidden = true;
        return;
      }
      vscode.postMessage({ type: 'mention_query', query: match[1] });
    });

    function insertMention(token) {
      const cursor = input.selectionStart;
      const before = input.value.slice(0, cursor);
      const match = before.match(/(?:^|\s)@([^\s]*)$/);
      if (!match) return;
      const start = cursor - match[1].length - 1;
      input.value = input.value.slice(0, start) + token + input.value.slice(cursor);
      const next = start + token.length;
      input.setSelectionRange(next, next);
      mentionMenu.hidden = true;
      input.focus();
    }

    function renderMentionSuggestions(message) {
      clear(mentionMenu);
      const symbols = Array.isArray(message.symbols) ? message.symbols : [];
      const files = Array.isArray(message.files) ? message.files : [];
      if (!symbols.length && !files.length) {
        mentionMenu.hidden = true;
        return;
      }
      symbols.forEach(symbol => {
        const option = makeElement('button', 'mention-option');
        option.type = 'button';
        option.appendChild(makeElement('span', 'mention-name', '@symbol:' + symbol.name));
        option.appendChild(makeElement('span', 'mention-meta', 'symbol · ' + symbol.kind + ' · ' + symbol.path + ':' + symbol.line));
        option.addEventListener('click', () => insertMention('@symbol:' + symbol.name));
        mentionMenu.appendChild(option);
      });
      files.forEach(file => {
        const option = makeElement('button', 'mention-option');
        option.type = 'button';
        option.appendChild(makeElement('span', 'mention-name', '@file:' + file));
        option.appendChild(makeElement('span', 'mention-meta', 'file · ' + file));
        option.addEventListener('click', () => insertMention('@file:' + file));
        mentionMenu.appendChild(option);
      });
      mentionMenu.hidden = false;
    }

    exploreButton.addEventListener('click', () => setFuturesMode(probeRow.hidden));
    exploreBackButton.addEventListener('click', () => setFuturesMode(false));
    document.getElementById('show-risks').addEventListener('click', showImpact);
    contextView.addEventListener('click', () => {
      const show = receiptSection.hidden;
      receiptSection.hidden = !show;
      receiptSection.open = show;
      contextView.textContent = show ? 'Hide' : 'View';
      if (show) reveal(receiptSection);
    });
    document.getElementById('open-editor').addEventListener('click', () => vscode.postMessage({ type: 'open_in_editor' }));
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
      vscode.postMessage({ type: 'cancel', requestedAt: Date.now() });
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

    document.getElementById('discard').addEventListener('click', () => {
      if (state.applying) return;
      vscode.postMessage({ type: 'discard_all' });
      resetReview();
    });

    function resetReview() {
      state.runStarted = false;
      state.readByAgent = [];
      renderReadByAgent();
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
      stopRunTimer();
      state.run = null;
      renderStepper();
      renderFutures();
      renderVerification();
      renderPassport();
      updateEmptyState();
      renderChangedFilesSummary();
      updateReviewSummary();
    }

    function startRun(mode) {
      state.runStarted = true;
      renderChangedFilesSummary();
      state.readByAgent = [];
      renderReadByAgent();
      updateEmptyState();
      startStepper(mode);
      activitySection.open = true;
      clear(errorArea);
      clear(resultArea);
      state.activities = [];
      renderActivity();
      state.verifyEvents = [];
      renderVerification();
      if (mode === 'futures') {
        state.passport = null;
        renderPassport();
        state.futures = emptyFutures();
        renderFutures();
      }
      setBusy(true);
    }

    /** Applies a review decision made in another open Voltix view. */
    function syncDecision(change) {
      const index = state.changes.findIndex(item => item.id === change.id);
      if (index === -1) state.changes.push(change);
      else state.changes[index] = change;
      if (!state.selectedId) state.selectedId = change.id;
      state.outcomes.delete(change.id);
      state.decisions.delete(change.id);
      change.hunks.forEach(hunk => state.hunkDecisions.delete(hunk.id));
      if (change.fileDecision === true) state.decisions.set(change.id, 'accept');
      else if (change.fileDecision === false) state.decisions.set(change.id, 'reject');
      else {
        change.hunks.forEach(hunk => {
          if (hunk.accepted === true) state.hunkDecisions.set(hunk.id, 'accept');
          else if (hunk.accepted === false) state.hunkDecisions.set(hunk.id, 'reject');
        });
      }
      updateReviewSummary();
    }

    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
      if (!target) return;
      const action = target.dataset.action;
      const changeId = target.dataset.changeId;
      if (action === 'dismiss-error') {
        clear(errorArea);
      } else if (action === 'copy-passport') {
        vscode.postMessage({ type: 'copy_passport' });
      } else if (action === 'mode-agent') {
        setFuturesMode(false);
        document.querySelectorAll('button.mode').forEach(mode => mode.setAttribute('aria-pressed', mode.dataset.action === 'mode-agent' ? 'true' : 'false'));
        input.focus();
      } else if (action === 'mode-futures') {
        setFuturesMode(true);
        document.querySelectorAll('button.mode').forEach(mode => mode.setAttribute('aria-pressed', mode.dataset.action === 'mode-futures' ? 'true' : 'false'));
        if (state.futures.strategies.length) reveal(futuresArea);
      } else if (action === 'mode-impact') {
        document.querySelectorAll('button.mode').forEach(mode => mode.setAttribute('aria-pressed', mode.dataset.action === 'mode-impact' ? 'true' : 'false'));
        showImpact();
      } else if (action === 'undo-last') {
        vscode.postMessage({ type: 'undo_last' });
      } else if (action === 'open-diff' && changeId) {
        vscode.postMessage({ type: 'open_diff', changeId, futureId: target.dataset.futureId || undefined });
      } else if (action === 'open-compare') {
        vscode.postMessage({ type: 'open_compare' });
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
      if (message.type === 'replay_boundary') {
        state.replaying = message.phase === 'start';
        if (!state.replaying && state.run && !state.run.finished && !state.runTimer) state.runTimer = setInterval(renderStepper, 1000);
        return;
      }
      trackRun(message);
      if (message.type === 'mention_suggestions') {
        renderMentionSuggestions(message);
      } else if (message.type === 'context_compacted') {
        updateActivity({
          id: 'context-compaction-' + message.thresholdTokens,
          name: 'Context compaction',
          summary: 'Context compacted at ' + message.triggerContextTokens.toLocaleString() + ' tokens (threshold ' + message.thresholdTokens.toLocaleString() + ')',
          status: 'Context compacted',
        });
      } else if (message.type === 'approval_required') {
        state.pendingApproval = { toolCallId: message.toolCallId, summary: message.summary };
        approvalBanner.hidden = false;
        approvalBanner.textContent = 'TrueForge is waiting for your review';
        reviewSection.hidden = false;
        if (reviewSection.scrollIntoView) reviewSection.scrollIntoView({ block: 'start' });
        updateActivity({ id: 'approval-' + message.toolCallId, name: 'submit_changes', summary: 'Approval required: ' + message.summary, status: 'Waiting for review' });
      } else if (message.type === 'approval_decision') {
        approvalBanner.hidden = true;
        state.pendingApproval = null;
        updateActivity({ id: 'approval-' + message.toolCallId, name: 'submit_changes', summary: message.decision === 'allow' ? 'Approved: changes applied' : 'Denied: ' + (message.reason || 'User rejected changes'), status: message.decision === 'allow' ? 'Approved' : 'Denied' });
      } else if (message.type === 'chat_message') {
        appendConversationMessage(message.role, message.content || '');
      } else if (message.type === 'model_status') {
        appendConversationMessage('assistant', message.content || '');
      } else if (message.type === 'text_delta') {
        const response = ensureAssistantResponse();
        response.content += message.content || '';
        renderConversation();
      } else if (message.type === 'tool_start') {
        let toolArgs = {};
        try { toolArgs = JSON.parse(message.argsPreview || '{}'); } catch (_) {}
        let innerName = message.name;
        let innerArgs = toolArgs;
        if (message.name === 'call_tool') {
          innerName = toolArgs.tool_name || toolArgs.name || toolArgs.tool || 'workspace tool';
          innerArgs = toolArgs.arguments && typeof toolArgs.arguments === 'object' ? toolArgs.arguments : toolArgs;
        }
        if (innerName === 'search_workspace') {
          state.readByAgent.push("search '" + (innerArgs.query || '') + "'");
          renderReadByAgent();
        } else if (innerName === 'read_file') {
          const start = innerArgs.start_line ? innerArgs.start_line : 1;
          const end = innerArgs.end_line ? innerArgs.end_line : start;
          state.readByAgent.push("read " + (innerArgs.path || 'unknown file') + ' ' + start + '–' + end);
          renderReadByAgent();
        }
        updateActivity({
          id: message.id,
          name: message.name || 'Tool request',
          summary: toolStartSummary(message.name || 'Tool request', message.argsPreview || ''),
          status: message.status === 'approval_required' ? 'Approval required' : 'Tool request observed',
          argsPreview: message.argsPreview || '',
        });
      } else if (message.type === 'tool_done') {
        updateActivity({
          id: message.id,
          name: message.name || state.activities.find(item => item.id === message.id)?.name || 'Tool response',
          summary: message.summary || state.activities.find(item => item.id === message.id)?.summary || (message.name || 'Tool response') + ' → completed',
          status: message.isError === true ? 'Tool reported an error' :
            message.isError === false ? 'Explicit tool success result received' :
            'Tool response received; success or failure not provided',
          resultPreview: message.resultPreview || '',
        });
      } else if (message.type === 'text_done') {
        const response = ensureAssistantResponse();
        response.content = message.fullContent || '';
        renderConversation();
        renderChangedFilesSummary();
      } else if (message.type === 'turn_done') {
        setBusy(false);
        renderChangedFilesSummary();
        status.textContent = message.status === 'cancelled' ? 'Turn cancelled.' :
          message.status === 'error' ? 'The turn ended with an error.' : 'Turn complete.';
        if (message.status !== 'done') {
          appendConversationMessage('assistant', message.message ||
            (message.status === 'cancelled' ? 'Turn cancelled.' : 'The turn ended with an error.'));
        }
        state.activeResponseIndex = -1;
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
        appendConversationMessage('assistant', 'Request failed: ' + (message.message || 'An unexpected error occurred.'));
        state.activeResponseIndex = -1;
        updateActivity({ id: 'error-' + state.activities.length, name: 'Request error', status: message.message || 'Request failed' });
      } else if (message.type === 'context_receipt') {
        renderReceipt(message.receipt || {});
      } else if (message.type === 'pending_change' && message.change && message.change.id) {
        state.runStarted = true;
        updateEmptyState();
        const index = state.changes.findIndex(change => change.id === message.change.id);
        if (index === -1) state.changes.push(message.change);
        else state.changes[index] = message.change;
        if (!state.selectedId) state.selectedId = message.change.id;
        clear(resultArea);
        updateReviewSummary();
        renderChangedFilesSummary();
      } else if (message.type === 'change_removed') {
        const removedChange = state.changes.find(change => change.id === message.changeId);
        if (removedChange) removedChange.hunks.forEach(hunk => state.hunkDecisions.delete(hunk.id));
        state.changes = state.changes.filter(change => change.id !== message.changeId);
        state.decisions.delete(message.changeId);
        state.outcomes.delete(message.changeId);
        if (state.selectedId === message.changeId) state.selectedId = state.changes.length ? state.changes[0].id : null;
        updateReviewSummary();
        renderChangedFilesSummary();
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
        state.activeModel = message.model;
        if (!state.modelChain.includes(message.model)) state.modelChain.unshift(message.model);
        const shortName = String(message.model).includes('/') ? String(message.model).split('/').pop() : String(message.model);
        headerModel.textContent = shortName || 'Model';
        headerModel.title = 'Fallback chain: ' + (state.modelChain.length ? state.modelChain.join(' → ') : String(message.model));
      } else if (message.type === 'model_chain') {
        state.modelChain = message.models || [];
        state.activeModel = message.active || state.activeModel;
        const shortName = String(state.activeModel).includes('/') ? String(state.activeModel).split('/').pop() : String(state.activeModel);
        headerModel.textContent = shortName || 'Model';
        headerModel.title = 'Fallback chain: ' + (state.modelChain.length ? state.modelChain.join(' → ') : (state.activeModel || 'Not set'));
      } else if (message.type === 'connection_status') {
        const baseUrl = String(message.baseUrl || '');
        let host = baseUrl;
        try {
          const parsed = new URL(baseUrl);
          host = parsed.host || parsed.hostname;
        } catch (_) {}
        connectionLabel.textContent = 'TrueForge · ' + host;
        connectionLabel.title = message.connected ? 'Connected to TrueForge at ' + baseUrl :
          'Could not reach TrueForge at ' + baseUrl + (message.error ? ': ' + message.error : '');
        connectionDot.classList.toggle('connected', Boolean(message.connected));
        connectionDot.classList.toggle('disconnected', !message.connected);
        connectionDot.title = message.connected ? 'Connected' : 'Not reachable';
        connectionDot.setAttribute('aria-label', message.connected ? 'Connected' : 'Not reachable');
      } else if (message.type === 'session_state') {
        state.sessionId = message.sessionId || '';
        openSessionButton.disabled = !state.sessionId;
      } else if (message.type === 'safety_proof') {
        renderSafetyProof(message);
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
        appendConversationMessage('assistant', 'Voltix is building each strategy in its own isolated future. Your files are not being changed.');
        renderFutures();
      } else if (message.type === 'future_progress') {
        state.futures.phases[message.futureId] = { phase: message.phase, label: message.label };
        renderFutures();
      } else if (message.type === 'future_result') {
        state.futures.results[message.futureId] = { evidence: message.evidence, passport: message.passport, changes: message.changes || [] };
        renderFutures();
      } else if (message.type === 'futures_compare') {
        state.futures.rows = message.rows || [];
        appendConversationMessage('assistant', 'Both futures are ready. Compare the evidence, then choose one.');
        status.textContent = 'Compare the evidence, then choose a future.';
        renderFutures();
      } else if (message.type === 'regret') {
        state.futures.regret = message;
        renderFutures();
      } else if (message.type === 'futures_chosen') {
        state.futures.chosen = { futureId: message.futureId, otherId: message.otherId };
        appendConversationMessage('assistant', 'Future ' + message.futureId + ' moved to Proposed files. Nothing is written until you accept and apply it.');
        status.textContent = 'Chose Future ' + message.futureId + ' over ' + message.otherId + '. Review its changes below.';
        renderFutures();
      } else if (message.type === 'futures_cleared') {
        state.futures = emptyFutures();
        renderFutures();
      } else if (message.type === 'run_started') {
        state.activeResponseIndex = -1;
        startRun(message.mode);
      } else if (message.type === 'change_decision' && message.change) {
        syncDecision(message.change);
      } else if (message.type === 'review_reset') {
        resetReview();
      } else if (message.type === 'history_state') {
        state.history = { canUndo: Boolean(message.canUndo), files: message.files || [] };
        undoHeaderButton.disabled = !state.history.canUndo;
      } else if (message.type === 'recent_runs') {
        renderRecentRuns(message.runs || []);
        renderHistory();
      } else if (message.type === 'focus_section' && message.section === 'futures') {
        reveal(futuresArea);
      }
    });

    cancelButton.disabled = true;
    undoHeaderButton.addEventListener('click', () => vscode.postMessage({ type: 'undo_last' }));
    openSessionButton.addEventListener('click', () => {
      if (state.sessionId) vscode.postMessage({ type: 'open_session' });
    });
    renderVerification();
    renderPassport();
    renderHistory();
    updateReviewSummary();
    vscode.postMessage({ type: 'panel_ready' });
  </script>
</body>
</html>`;
}
