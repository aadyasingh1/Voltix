import { processTurn } from '../agent/streamProcessor';
import { getModelChain, getSettings } from '../config/settings';
import { assembleContext } from '../context/retriever';
import { FUTURE_ACCESS, READ_ONLY_ACCESS, resetActiveStore, setActiveStore } from '../review/activeStore';
import { buildPassport } from '../review/passport';
import { PendingChanges, PendingChangeStore } from '../review/pendingChanges';
import { getWorkspaceRoot } from '../tools/pathGuard';
import { getLogger } from '../utils/logger';
import { runProbeInSandbox, validateProbeCommand } from '../verify/sandbox';
import { copyVerification, currentRecord, pendingFiles, resetVerification } from '../verify/verifier';
import { runVerifyLoop } from '../verify/verifyLoop';
import type {
  ChangePassport, ComparisonRow, FutureEvidence, FutureId, FuturePhase, FutureProbeResult, FutureStrategy, PanelOutboundMessage,
} from '../../../shared/types';
import { buildComparison, buildEvidence } from './evidence';
import { runOnModelChain, type Session } from './modelRunner';
import { planStrategies } from './strategyPlanner';

type Post = (message: PanelOutboundMessage) => void;

interface FutureEntry {
  strategy: FutureStrategy;
  store: PendingChangeStore;
  phase: FuturePhase;
  label: string;
  evidence?: FutureEvidence;
  passport: ChangePassport | null;
}

interface FuturesRun {
  strategies: FutureStrategy[];
  usedFallback: boolean;
  entries: Map<FutureId, FutureEntry>;
  rows?: ComparisonRow[];
}

export function buildFuturePrompt(strategy: FutureStrategy, task: string, context: string): string {
  return [
    `Implement this task using ONLY this strategy: ${strategy.title} — ${strategy.approach}`,
    '',
    task,
    '',
    'Do not use run_command in this run; test with verify_changes, which runs in a sandbox.',
    '',
    'Selected workspace context:',
    context,
  ].join('\n');
}

export class FuturesEngine {
  private run: FuturesRun | null = null;
  private exploring = false;
  private choosing = false;
  private cancelled = false;
  private session: Session | undefined;

  constructor(private readonly post: Post, private readonly onChosenPassport: (passport: ChangePassport | null) => void) {}

  get busy(): boolean {
    return this.exploring || this.choosing;
  }

  /** Re-sends the current run to a newly opened panel. */
  replay(): void {
    const run = this.run;
    if (!run) return;
    this.post({ type: 'futures_plan', strategies: run.strategies, usedFallback: run.usedFallback });
    for (const [futureId, entry] of run.entries) {
      this.post({ type: 'future_progress', futureId, phase: entry.phase, label: entry.label });
      if (entry.evidence) {
        this.post({ type: 'future_result', futureId, evidence: entry.evidence, passport: entry.passport, changes: entry.store.getAll() });
      }
    }
    if (run.rows) this.post({ type: 'futures_compare', rows: run.rows });
  }

  async explore(task: string, probeInput?: string): Promise<void> {
    if (this.busy) throw new Error('Futures are already running.');
    if (!task.trim()) throw new Error('Describe a task before exploring futures.');
    if (PendingChanges.getAll().length) {
      throw new Error('Apply or discard the current proposed changes before exploring futures.');
    }
    const settings = getSettings();
    const probeCommand = (probeInput ?? settings.futuresProbeCommand).trim();
    if (probeCommand) {
      const invalid = validateProbeCommand(probeCommand);
      if (invalid) throw new Error(invalid);
    }

    this.exploring = true;
    this.cancelled = false;
    this.run = null;
    try {
      const root = getWorkspaceRoot();
      this.post({ type: 'busy', busy: true, label: 'Planning two different strategies…' });
      const assembled = await assembleContext(task, root, settings.contextTokenBudget);
      this.post({ type: 'context_receipt', receipt: assembled.receipt });
      const context = assembled.items.map(item => `${item.path}\n${item.content}`).join('\n\n');
      const models = getModelChain();

      // Planning uses a throw-away store and read-only tools, so it cannot produce changes.
      setActiveStore(new PendingChangeStore(), READ_ONLY_ACCESS);
      const plan = await planStrategies(task, context, {
        models,
        isCancelled: () => this.cancelled,
        emit: this.forwardTools('Plan'),
        onSession: session => { this.session = session; },
        onModel: (model, fallbackFrom) => this.post({ type: 'model_info', model, fallbackFrom }),
      });
      resetActiveStore();
      if (this.cancelled || plan.status === 'cancelled') return this.finishCancelled();
      if (plan.status === 'error') throw new Error(`Could not plan futures: ${plan.message ?? 'the model failed'}`);

      const run: FuturesRun = {
        strategies: plan.strategies,
        usedFallback: plan.usedFallback,
        entries: new Map(plan.strategies.map(strategy => [strategy.id, {
          strategy, store: new PendingChangeStore(), phase: 'planning' as FuturePhase, label: 'Waiting', passport: null,
        }])),
      };
      this.run = run;
      this.post({ type: 'futures_plan', strategies: run.strategies, usedFallback: run.usedFallback });

      for (const strategy of run.strategies) {
        await this.runFuture(run.entries.get(strategy.id)!, task, context, probeCommand, models, root);
        if (this.cancelled) return this.finishCancelled();
      }

      const [a, b] = run.strategies.map(strategy => run.entries.get(strategy.id)!.evidence!);
      if (a.status === 'failed' && b.status === 'failed') {
        this.run = null;
        throw new Error(`Both futures failed. A: ${a.error ?? 'unknown error'} B: ${b.error ?? 'unknown error'}`);
      }
      run.rows = buildComparison(a, b);
      this.post({ type: 'busy', busy: false });
      this.post({ type: 'futures_compare', rows: run.rows });
    } catch (error) {
      this.run = null;
      throw error;
    } finally {
      resetActiveStore();
      this.exploring = false;
      this.session = undefined;
    }
  }

  private async runFuture(
    entry: FutureEntry,
    task: string,
    context: string,
    probeCommand: string,
    models: string[],
    root: string
  ): Promise<void> {
    const { strategy, store } = entry;
    const started = Date.now();
    let fixRounds = 0;
    let model: string | undefined;
    let passport: ChangePassport | null = null;
    let probe: FutureProbeResult | null = null;

    const finish = (status: FutureEvidence['status'], error?: string) => {
      const record = currentRecord(store);
      const evidence = buildEvidence({
        strategy,
        status,
        error,
        changes: store.getAll(),
        passport,
        tests: record
          ? { ran: true, passed: record.passed, summary: record.summary, command: record.command }
          : { ran: false, passed: false, summary: 'Not run' },
        fixRounds,
        probe,
        durationMs: Date.now() - started,
        model,
      });
      entry.evidence = evidence;
      entry.passport = passport;
      this.progress(entry, status === 'completed' ? 'done' : 'failed', status === 'completed' ? 'Ready to compare' : error ?? 'Failed');
      this.post({ type: 'future_result', futureId: strategy.id, evidence, passport, changes: store.getAll() });
    };

    setActiveStore(store, FUTURE_ACCESS);
    try {
      this.progress(entry, 'implementing', 'Implementing this strategy');
      this.post({ type: 'busy', busy: true, label: `Future ${strategy.id}: implementing "${strategy.title}"…` });
      const emit = this.forwardTools(strategy.id);
      const turn = await runOnModelChain(buildFuturePrompt(strategy, task, context), {
        models,
        isCancelled: () => this.cancelled,
        emit,
        onSession: session => { this.session = session; },
        onModel: (name, fallbackFrom) => {
          model = name;
          this.post({ type: 'model_info', model: name, fallbackFrom });
        },
        // A fallback model starts over, so evidence never mixes two models' partial work.
        onFallback: () => {
          store.clear();
          resetVerification(store);
        },
      });
      if (this.cancelled || turn.status === 'cancelled') return;
      if (turn.status === 'error') return finish('failed', turn.message ?? 'The model failed');
      model = turn.model ?? model;
      if (!store.getAll().length) return finish('failed', 'The agent finished without proposing any changes.');

      const settings = getSettings();
      if (settings.verifyEnabled) {
        const session = turn.session;
        ({ fixRounds } = await runVerifyLoop({
          store,
          maxRounds: settings.verifyMaxFixRounds,
          isCancelled: () => this.cancelled,
          canFix: () => Boolean(session),
          runFixTurn: prompt => processTurn(session!.client, session!.sessionId, prompt, emit, undefined, { deferErrors: true }),
          onVerification: event => {
            if (event.phase === 'running') this.progress(entry, 'verifying', 'Running tests in a sandbox');
            else if (event.phase === 'fixing') this.progress(entry, 'fixing', event.summary);
          },
          onBusy: label => this.post({ type: 'busy', busy: true, label: `Future ${strategy.id}: ${label}` }),
        }));
      }
      if (this.cancelled) return;

      const record = currentRecord(store);
      passport = await buildPassport(
        root,
        store.getAll(),
        record ? { passed: record.passed, command: record.command, summary: record.summary, fixRounds } : undefined,
        model
      );

      if (probeCommand) {
        this.progress(entry, 'probing', `Running probe: ${probeCommand}`);
        this.post({ type: 'busy', busy: true, label: `Future ${strategy.id}: running the behaviour probe…` });
        probe = await runProbeInSandbox(root, pendingFiles(store), probeCommand);
      }
      if (this.cancelled) return;
      finish('completed');
    } catch (error) {
      if (this.cancelled) return;
      const message = error instanceof Error ? error.message : String(error);
      getLogger().appendLine(`Future ${strategy.id} failed: ${message}`);
      finish('failed', message);
    } finally {
      resetActiveStore();
    }
  }

  /** Moves the chosen future into the normal review list. The other future is dropped. */
  async choose(futureId: FutureId): Promise<void> {
    if (this.busy) throw new Error('Wait for the current futures step to finish.');
    const run = this.run;
    const entry = run?.entries.get(futureId);
    if (!run || !entry?.evidence) throw new Error('That future is no longer available.');
    if (entry.evidence.status !== 'completed' || !entry.store.getAll().length) {
      throw new Error(`Future ${futureId} has no usable changes to choose.`);
    }
    if (PendingChanges.getAll().length) {
      throw new Error('Apply or discard the current proposed changes before choosing a future.');
    }

    this.choosing = true;
    try {
      this.adopt(entry, run);
    } finally {
      this.choosing = false;
    }
  }

  private adopt(entry: FutureEntry, run: FuturesRun): void {
    const { evidence, store, passport, strategy } = entry;
    for (const change of store.getAll()) {
      PendingChanges.adopt(change);
      this.post({ type: 'pending_change', change });
    }
    copyVerification(store, PendingChanges);
    this.onChosenPassport(passport);
    this.post({ type: 'passport', passport });
    if (evidence) {
      this.post({
        type: 'verification',
        phase: evidence.tests.ran ? (evidence.tests.passed ? 'passed' : 'failed') : 'skipped',
        command: evidence.tests.command,
        summary: evidence.tests.summary,
        round: evidence.fixRounds,
        maxRounds: getSettings().verifyMaxFixRounds,
        source: 'auto',
      });
    }
    const otherId: FutureId = strategy.id === 'A' ? 'B' : 'A';
    run.entries.forEach(item => { if (item !== entry) item.store.clear(); });
    this.run = null;
    this.post({ type: 'futures_chosen', futureId: strategy.id, otherId });
  }

  async cancel(): Promise<void> {
    this.cancelled = true;
    const session = this.session;
    if (session) await session.client.sessions.cancel(session.sessionId, {});
  }

  /** Drops every future. Nothing from a future has reached the review list or the disk. */
  async discard(): Promise<void> {
    if (this.busy) {
      try { await this.cancel(); } catch (error) {
        getLogger().appendLine(`Cancelling futures failed: ${error instanceof Error ? error.message : error}`);
      }
    }
    this.run = null;
    this.post({ type: 'futures_cleared' });
  }

  private finishCancelled(): void {
    this.run = null;
    this.post({ type: 'futures_cleared' });
    this.post({ type: 'turn_done', status: 'cancelled', message: 'Futures cancelled. No files were changed.' });
  }

  private progress(entry: FutureEntry, phase: FuturePhase, label: string): void {
    entry.phase = phase;
    entry.label = label;
    this.post({ type: 'future_progress', futureId: entry.strategy.id, phase, label });
  }

  /** Shows a future's tool calls in the activity list, and keeps its chat text out of the main response. */
  private forwardTools(prefix: string): (message: PanelOutboundMessage) => void {
    return message => {
      if (message.type === 'tool_start') {
        this.post({ ...message, id: `${prefix}:${message.id}`, name: `[${prefix}] ${message.name}` });
      } else if (message.type === 'tool_done') {
        this.post({ ...message, id: `${prefix}:${message.id}`, name: message.name ? `[${prefix}] ${message.name}` : undefined });
      }
    };
  }
}
