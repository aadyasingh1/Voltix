export type ContextSignal = 'explicit_mention' | 'symbol_match' | 'keyword_match' | 'filename_match' | 'import_relationship' | 'recency';

export interface ContextItem {
  path: string;
  absPath: string;
  startLine: number;
  endLine: number;
  content: string;
  signals: ContextSignal[];
  score: number;
  tokenEstimate: number;
}

export interface ContextReceipt {
  items: ContextItem[];
  excluded: number;
  searchedCount: number;
  excludedItems?: Array<{
    path: string;
    reason: 'context_budget';
  }>;
  totalTokens: number;
  budget: number;
  queryTerms: string[];
  assembledAt: number;
}

export type HunkLineType = 'context' | 'add' | 'remove';

export interface HunkLine { type: HunkLineType; content: string }

export interface Hunk {
  id: string;
  changeId: string;
  header: string;
  originalStart: number;
  originalCount: number;
  proposedStart: number;
  proposedCount: number;
  lines: HunkLine[];
  accepted: boolean | null;
}

export interface PendingChange {
  id: string;
  path: string;
  absPath: string;
  originalExists: boolean;
  originalContent: string;
  originalHash: string;
  proposedContent: string;
  reason: string;
  hunks: Hunk[];
  fileDecision: boolean | null;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface PassportFlag { level: RiskLevel; code: string; message: string }

export interface PassportFile {
  path: string;
  isNew: boolean;
  isTest: boolean;
  added: number;
  removed: number;
  originalLines: number;
  /** Functions/classes the change defines. */
  symbols: string[];
  /** Other workspace files that import this file (its blast radius). */
  dependents: string[];
  flags: PassportFlag[];
  risk: RiskLevel;
}

export interface ChangePassport {
  createdAt: number;
  model?: string;
  files: PassportFile[];
  totals: { files: number; added: number; removed: number; dependents: number; flags: number };
  testsTouched: boolean;
  verification?: { passed: boolean; command: string; summary: string; fixRounds: number };
  risk: RiskLevel;
}

export type VerifyPhase = 'running' | 'passed' | 'failed' | 'fixing' | 'skipped';

export type FutureId = 'A' | 'B';
export type FuturePhase = 'planning' | 'implementing' | 'verifying' | 'fixing' | 'probing' | 'done' | 'failed';

export interface FutureStrategy {
  id: FutureId;
  title: string;
  approach: string;
  tradeoff: string;
}

export interface FutureProbeResult {
  command: string;
  exitCode: number;
  passed: boolean;
  timedOut: boolean;
  /** Last 3000 characters of combined output. */
  output: string;
}

/** Measured facts about one future. Nothing here is estimated by a model. */
export interface FutureEvidence {
  futureId: FutureId;
  strategy: FutureStrategy;
  status: 'completed' | 'failed';
  error?: string;
  tests: { ran: boolean; passed: boolean; summary: string; command?: string };
  fixRounds: number;
  filesChanged: string[];
  added: number;
  removed: number;
  newImports: string[];
  risk: RiskLevel;
  flags: string[];
  blastRadius: number;
  probe: FutureProbeResult | null;
  durationMs: number;
  model?: string;
}

export interface ComparisonRow {
  key: string;
  label: string;
  a: string;
  b: string;
  /** The future with the better value, or null for a tie or when the values cannot be compared. */
  better: FutureId | null;
}

export type PanelOutboundMessage =
  | { type: 'text_delta'; content: string }
  | { type: 'text_done'; fullContent: string }
  | { type: 'tool_start'; id: string; name: string; argsPreview: string; status?: 'requested' | 'approval_required' }
  | { type: 'tool_done'; id: string; name?: string; summary?: string; resultPreview: string; isError?: boolean }
  | { type: 'context_receipt'; receipt: ContextReceipt }
  | { type: 'pending_change'; change: PendingChange }
  | { type: 'change_removed'; changeId: string }
  | { type: 'turn_done'; status: 'done' | 'cancelled' | 'error'; message?: string }
  | { type: 'cancelled_with_proposals'; count: number }
  | { type: 'error'; message: string; recoverable: boolean }
  | { type: 'busy'; busy: boolean; label?: string }
  | { type: 'model_info'; model: string; fallbackFrom?: string }
  | { type: 'model_chain'; models: string[]; active: string }
  | { type: 'connection_status'; connected: boolean; baseUrl: string; error?: string }
  | { type: 'session_state'; sessionId?: string }
  | {
      type: 'verification';
      phase: VerifyPhase;
      command?: string;
      summary: string;
      round: number;
      maxRounds: number;
      source: 'agent' | 'auto';
      output?: string;
      durationMs?: number;
    }
  | { type: 'passport'; passport: ChangePassport | null }
  | { type: 'futures_config'; probeCommand: string }
  | { type: 'futures_plan'; strategies: FutureStrategy[]; usedFallback: boolean }
  | { type: 'future_progress'; futureId: FutureId; phase: FuturePhase; label: string }
  | { type: 'future_result'; futureId: FutureId; evidence: FutureEvidence; passport: ChangePassport | null; changes: PendingChange[] }
  | { type: 'futures_compare'; rows: ComparisonRow[] }
  | { type: 'regret'; futureId: FutureId; gain: string[]; giveUp: string[]; regretIf: string[]; source: 'model' | 'evidence' }
  | { type: 'futures_chosen'; futureId: FutureId; otherId: FutureId }
  | { type: 'futures_cleared' }
  | { type: 'run_started'; mode: 'agent' | 'futures' }
  | { type: 'change_decision'; change: PendingChange }
  | { type: 'review_reset' }
  | { type: 'history_state'; canUndo: boolean; files: string[] }
  | { type: 'focus_section'; section: 'futures' }
  | { type: 'replay_boundary'; phase: 'start' | 'end' }
  | {
      type: 'apply_result';
      success: boolean;
      applied: string[];
      restored: string[];
      unchanged: string[];
      manualRecovery: string[];
      failed: string[];
      conflicts: string[];
    };

export type PanelInboundMessage =
  | { type: 'submit'; text: string }
  | { type: 'cancel' }
  | { type: 'accept_file'; changeId: string }
  | { type: 'reject_file'; changeId: string }
  | { type: 'accept_hunk'; changeId: string; hunkId: string }
  | { type: 'reject_hunk'; changeId: string; hunkId: string }
  | { type: 'apply_accepted' }
  | { type: 'discard_all' }
  | { type: 'copy_passport' }
  | { type: 'panel_ready' }
  | { type: 'explore_futures'; text: string; probeCommand?: string }
  | { type: 'choose_future'; futureId: FutureId }
  | { type: 'discard_futures' }
  | { type: 'open_diff'; changeId: string; futureId?: FutureId }
  | { type: 'open_in_editor' }
  | { type: 'open_compare' }
  | { type: 'undo_last' }
  | { type: 'open_session' };

export interface WorkspaceFile { path: string; absPath: string; sizeBytes: number; language: string }
export interface SearchResult { path: string; absPath: string; line: number; column: number; lineContent: string }
export interface CommandResult { command: string; stdout: string; stderr: string; exitCode: number; timedOut: boolean; durationMs: number }
export type VerificationStatus = 'verified' | 'partial' | 'not_verified' | 'failed';
export interface VerificationReport {
  filesChanged: string[];
  filesAccepted: string[];
  filesRejected: string[];
  commandsRun: CommandResult[];
  overallPassed: boolean | null;
  status: VerificationStatus;
  summary: string;
}
