import type { AgentSurface } from '../ui/surfaceHub';
import { createSession } from '../agent/session';
import { processTurn } from '../agent/streamProcessor';
import { assembleContext } from '../context/retriever';
import { getSettings, getModelChain } from '../config/settings';
import { getWorkspaceRoot } from '../tools/pathGuard';
import { getLogger } from '../utils/logger';
import { PendingChanges } from '../review/pendingChanges';
import { buildPassport } from '../review/passport';
import { currentRecord } from '../verify/verifier';
import { runVerifyLoop } from '../verify/verifyLoop';
import type { ChangePassport, PanelOutboundMessage } from '../../../shared/types';
import { resolveSymbol } from '../context/symbolResolver';

type Session = Awaited<ReturnType<typeof createSession>>;
type Emit = (message: PanelOutboundMessage) => void;
const RETRY_DELAYS_MS = [800, 1600];

export class AgentMode {
  private client: Session['client'] | undefined;
  private sessionId: string | undefined;
  private sessionModel: string | undefined;
  private cancelled = false;
  private cancelRetry: (() => void) | undefined;
  private pendingApproval: { toolCallId: string; threadId: string; turnId: string } | undefined;
  lastPassport: ChangePassport | null = null;
  lastStatus: 'done' | 'cancelled' | 'error' | undefined;

  constructor(private readonly surface: AgentSurface) {}

  get currentSessionId(): string | undefined {
    return this.sessionId;
  }

  get currentModel(): string | undefined {
    return this.sessionModel;
  }

  async submit(text: string) {
    this.lastStatus = undefined;
    this.cancelled = false;
    const emit: Emit = message => this.surface.post(message);
    const root = getWorkspaceRoot();
    const context = await assembleContext(text, root, getSettings().contextTokenBudget, resolveSymbol);
    if (this.cancelled) {
      this.lastStatus = 'cancelled';
      return;
    }
    const enriched = `${text}\n\nSelected workspace context:\n${context.items.map(item => `${item.path}\n${item.content}`).join('\n\n')}`;

    // Primary model first; on failure, automatically fall back to the next configured model.
    const models = getModelChain();
    const currentIndex = this.sessionModel ? Math.max(0, models.indexOf(this.sessionModel)) : 0;
    const chain = [...models.slice(currentIndex), ...models.slice(0, currentIndex)];
    let lastError = 'Unknown error';

    for (let index = 0; index < chain.length; index++) {
      const model = chain[index];
      const isLast = index === chain.length - 1;
      if (this.cancelled) {
        this.lastStatus = 'cancelled';
        return;
      }
      emit({ type: 'model_chain', models: getModelChain(), active: model });
      emit({ type: 'model_info', model, fallbackFrom: index > 0 ? chain[index - 1] : undefined });
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        try {
          if (!this.client || !this.sessionId || this.sessionModel !== model) {
            const session = await createSession(model, `Voltix · ${text.slice(0, 60)}`);
            this.client = session.client;
            this.sessionId = session.sessionId;
            this.sessionModel = model;
            emit({ type: 'session_state', sessionId: this.sessionId });
          }
          if (this.cancelled) {
            this.lastStatus = 'cancelled';
            return;
          }
          const result = await processTurn(this.client, this.sessionId!, enriched, emit, () => {
            emit({ type: 'context_receipt', receipt: context.receipt });
          }, {
            deferErrors: true,
            onApprovalRequired: approval => {
              this.pendingApproval = approval;
            },
          });
          if (result.status === 'done') {
            await this.afterTurn(emit, model);
            this.lastStatus = this.cancelled ? 'cancelled' : 'done';
            return;
          }
          if (result.status === 'cancelled') {
            this.lastStatus = 'cancelled';
            return;
          }
          lastError = result.message || 'The model returned an error';
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
        if (this.cancelled) {
          this.lastStatus = 'cancelled';
          return;
        }
        if (attempt < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[attempt];
          const retryNumber = attempt + 1;
          emit({ type: 'model_status', content: `Primary model failed (${lastError}). Retrying ${retryNumber}/2 after ${delay / 1000}s…` });
          if (!await this.waitForRetry(delay)) {
            this.lastStatus = 'cancelled';
            return;
          }
          continue;
        }
      }
      if (this.cancelled) {
        this.lastStatus = 'cancelled';
        return;
      }
      if (isLast) {
        this.lastStatus = 'error';
        throw new Error(`Model "${model}" failed after 2 retries: ${lastError}`);
      }
      this.client = undefined;
      this.sessionId = undefined;
      PendingChanges.clear();
      emit({ type: 'session_state' });
      const next = chain[index + 1];
      const notice = `Switched to fallback model ${next}, no click needed`;
      getLogger().appendLine(notice);
      emit({ type: 'model_status', content: notice });
    }
  }

  /** Verify-before-apply loop, then the Change Passport. */
  private async afterTurn(emit: Emit, model: string) {
    const settings = getSettings();
    let fixRounds = 0;
    try {
      if (settings.verifyEnabled && PendingChanges.getAll().length) {
        ({ fixRounds } = await runVerifyLoop({
          store: PendingChanges,
          maxRounds: settings.verifyMaxFixRounds,
          isCancelled: () => this.cancelled,
          canFix: () => Boolean(this.client && this.sessionId),
          runFixTurn: prompt => processTurn(this.client!, this.sessionId!, prompt, emit, undefined, {}),
          onVerification: emit,
          onBusy: label => emit({ type: 'busy', busy: true, label }),
        }));
      }
    } finally {
      emit({ type: 'busy', busy: false });
    }

    const changes = PendingChanges.getAll();
    if (!changes.length) {
      this.lastPassport = null;
      emit({ type: 'passport', passport: null });
      return;
    }
    const record = currentRecord();
    try {
      this.lastPassport = await buildPassport(
        getWorkspaceRoot(),
        changes,
        record ? { passed: record.passed, command: record.command, summary: record.summary, fixRounds } : undefined,
        model
      );
      emit({ type: 'passport', passport: this.lastPassport });
    } catch (error) {
      getLogger().appendLine(`Change Passport failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async cancel() {
    this.cancelled = true;
    this.cancelRetry?.();
    if (this.client && this.sessionId) await this.client.sessions.cancel(this.sessionId, {});
  }

  async approveSubmittedChanges(): Promise<void> {
    if (!this.client || !this.sessionId || !this.pendingApproval) return;
    const approval = this.pendingApproval;
    await this.client.sessions.createTurnEvents(this.sessionId, approval.turnId, {
      events: [{
        type: 'user.tool_approval',
        threadId: approval.threadId,
        toolCallId: approval.toolCallId,
        approval: { status: 'allow' },
      }],
    });
  }

  async denySubmittedChanges(reason = 'User rejected changes'): Promise<void> {
    if (!this.client || !this.sessionId || !this.pendingApproval) return;
    const approval = this.pendingApproval;
    await this.client.sessions.createTurnEvents(this.sessionId, approval.turnId, {
      events: [{
        type: 'user.tool_approval',
        threadId: approval.threadId,
        toolCallId: approval.toolCallId,
        approval: { status: 'deny', reason },
      }],
    });
  }

  private waitForRetry(delay: number): Promise<boolean> {
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this.cancelRetry = undefined;
        resolve(!this.cancelled);
      }, delay);
      this.cancelRetry = () => {
        clearTimeout(timer);
        this.cancelRetry = undefined;
        resolve(false);
      };
    });
  }
}
