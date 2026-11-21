import type { TurnResult } from '../agent/streamProcessor';
import type { PendingChangeStore } from '../review/pendingChanges';
import type { PanelOutboundMessage } from '../../../shared/types';
import { validateVerifyCommand } from './sandbox';
import { chooseCommand, currentRecord, verifyPending, type VerificationRecord } from './verifier';

export type VerificationEvent = Extract<PanelOutboundMessage, { type: 'verification' }>;

export interface VerifyLoopOptions {
  store: PendingChangeStore;
  maxRounds: number;
  isCancelled: () => boolean;
  /** False when there is no live agent session to send failures back to. */
  canFix: () => boolean;
  runFixTurn: (prompt: string) => Promise<TurnResult>;
  onVerification: (event: VerificationEvent) => void;
  onBusy: (label: string) => void;
}

export function buildFixPrompt(record: VerificationRecord, round: number, maxRounds: number): string {
  const tail = record.output.length > 6000 ? '[...]\n' + record.output.slice(-6000) : record.output;
  return [
    `Automatic verification FAILED (fix round ${round} of ${maxRounds}).`,
    `Voltix ran \`${record.command}\` against your pending edits in a sandbox copy of the workspace: ${record.summary}`,
    '',
    'Output (tail):',
    '```',
    tail,
    '```',
    '',
    'Find the root cause and fix it with edit_file. If a test expectation contradicts the requirement, fix the test;',
    'if the code is wrong, fix the code. Never delete tests or assertions just to make them pass, and do not touch unrelated files.',
    `Then call verify_changes with \`${record.command}\` and finish with a one-paragraph summary of what you fixed.`,
  ].join('\n');
}

/** Verify-before-apply: test the store's pending changes and send failures back to the agent. */
export async function runVerifyLoop(options: VerifyLoopOptions): Promise<{ fixRounds: number }> {
  const { store, maxRounds, onVerification, onBusy } = options;
  let fixRounds = 0;
  for (;;) {
    if (options.isCancelled()) break;
    const command = chooseCommand(store);
    const invalid = command ? validateVerifyCommand(command) : 'No test command found. Set voltix.verify.command to enable verification.';
    if (!command || invalid) {
      onVerification({ type: 'verification', phase: 'skipped', command, summary: invalid ?? '', round: fixRounds, maxRounds, source: 'auto' });
      break;
    }
    let record = currentRecord(store);
    // Reuse the agent's own verify_changes result when it already covers these exact pending changes.
    const fresh = !record || record.command !== command;
    if (fresh) {
      onBusy('Verifying the proposed changes in a sandbox…');
      onVerification({ type: 'verification', phase: 'running', command, summary: 'Running tests against the pending changes in a sandbox copy…', round: fixRounds, maxRounds, source: 'auto' });
      try {
        record = await verifyPending(command, 'auto', store);
      } catch (error) {
        onVerification({ type: 'verification', phase: 'skipped', command, summary: error instanceof Error ? error.message : String(error), round: fixRounds, maxRounds, source: 'auto' });
        break;
      }
    }
    if (!record) break;
    if (fresh) {
      onVerification({
        type: 'verification', phase: record.passed ? 'passed' : 'failed', command: record.command, summary: record.summary,
        round: fixRounds, maxRounds, source: record.source, output: record.output.slice(-4000), durationMs: record.durationMs,
      });
    }
    if (record.passed || fixRounds >= maxRounds || !options.canFix() || options.isCancelled()) break;

    fixRounds++;
    onVerification({ type: 'verification', phase: 'fixing', command: record.command, summary: `Sending the failures back to the agent (fix round ${fixRounds} of ${maxRounds})…`, round: fixRounds, maxRounds, source: 'auto' });
    onBusy(`Agent is fixing the failing tests (round ${fixRounds} of ${maxRounds})…`);
    const result = await options.runFixTurn(buildFixPrompt(record, fixRounds, maxRounds));
    if (result.status !== 'done') break;
  }
  return { fixRounds };
}
