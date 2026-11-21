import * as vscode from 'vscode';
import type { AgentPanel } from '../ui/agentPanel';
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

type Session = Awaited<ReturnType<typeof createSession>>;
type Emit = (message: PanelOutboundMessage) => void;

export class AgentMode {
  private client: Session['client'] | undefined;
  private sessionId: string | undefined;
  private sessionModel: string | undefined;
  private cancelled = false;
  lastPassport: ChangePassport | null = null;

  constructor(private panel: AgentPanel) {}

  setPanel(panel: AgentPanel) {
    this.panel = panel;
  }

  async submit(text: string) {
    const emit: Emit = message => this.panel.post(message);
    const root = getWorkspaceRoot();
    const context = await assembleContext(text, root, getSettings().contextTokenBudget);
    const enriched = `${text}\n\nSelected workspace context:\n${context.items.map(item => `${item.path}\n${item.content}`).join('\n\n')}`;
    this.cancelled = false;

    // Primary model first; on failure, automatically fall back to the next configured model.
    const models = getModelChain();
    const currentIndex = this.sessionModel ? Math.max(0, models.indexOf(this.sessionModel)) : 0;
    const chain = [...models.slice(currentIndex), ...models.slice(0, currentIndex)];
    let lastError = 'Unknown error';

    for (let index = 0; index < chain.length; index++) {
      const model = chain[index];
      const isLast = index === chain.length - 1;
      emit({ type: 'model_info', model, fallbackFrom: index > 0 ? chain[index - 1] : undefined });
      try {
        if (!this.client || !this.sessionId || this.sessionModel !== model) {
          const session = await createSession(model);
          this.client = session.client;
          this.sessionId = session.sessionId;
          this.sessionModel = model;
        }
        const result = await processTurn(this.client, this.sessionId!, enriched, emit, () => {
          emit({ type: 'context_receipt', receipt: context.receipt });
        }, { deferErrors: !isLast });
        if (result.status === 'done') {
          await this.afterTurn(emit, model);
          return;
        }
        if (result.status === 'cancelled') return;
        lastError = result.message || 'The model returned an error';
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (isLast) throw new Error(`Model "${model}" failed: ${lastError}`);
      }
      if (this.cancelled) return;
      if (isLast) return;
      this.client = undefined;
      this.sessionId = undefined;
      const next = chain[index + 1];
      const notice = `Voltix: model "${model}" failed (${lastError}). Switching automatically to "${next}".`;
      getLogger().appendLine(notice);
      void vscode.window.showWarningMessage(notice);
      emit({ type: 'text_delta', content: `⚠ ${notice}\n\n` });
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
    if (this.client && this.sessionId) await this.client.sessions.cancel(this.sessionId, {});
  }
}
