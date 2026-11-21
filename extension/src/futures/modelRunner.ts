import { createSession } from '../agent/session';
import { processTurn } from '../agent/streamProcessor';
import type { PanelOutboundMessage } from '../../../shared/types';

export type Session = Awaited<ReturnType<typeof createSession>>;

export interface ModelRunOptions {
  models: string[];
  isCancelled: () => boolean;
  emit?: (message: PanelOutboundMessage) => void;
  /** Called with each new session, so the caller can cancel it or send it follow-up turns. */
  onSession?: (session: Session) => void;
  onModel?: (model: string, fallbackFrom?: string) => void;
  /** Called before a fallback model starts, so partial work from the failed model can be dropped. */
  onFallback?: () => void;
}

export interface ModelRunResult {
  status: 'done' | 'cancelled' | 'error';
  model?: string;
  session?: Session;
  text: string;
  message?: string;
}

/** One turn in a fresh TrueForge session, trying each configured model in order. */
export async function runOnModelChain(prompt: string, options: ModelRunOptions): Promise<ModelRunResult> {
  let lastError = 'No model is configured';
  for (let index = 0; index < options.models.length; index++) {
    if (options.isCancelled()) return { status: 'cancelled', text: '' };
    const model = options.models[index];
    if (index > 0) options.onFallback?.();
    options.onModel?.(model, index > 0 ? options.models[index - 1] : undefined);
    try {
      const session = await createSession(model);
      options.onSession?.(session);
      if (options.isCancelled()) return { status: 'cancelled', model, session, text: '' };
      let text = '';
      const result = await processTurn(session.client, session.sessionId, prompt, message => {
        if (message.type === 'text_delta') text += message.content;
        else if (message.type === 'text_done') text = message.fullContent;
        options.emit?.(message);
      }, undefined, { deferErrors: true });
      if (result.status === 'done') return { status: 'done', model, session, text };
      if (result.status === 'cancelled') return { status: 'cancelled', model, session, text };
      lastError = result.message || 'The model returned an error';
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (options.isCancelled()) return { status: 'cancelled', model, text: '' };
  }
  return { status: 'error', text: '', message: lastError };
}
