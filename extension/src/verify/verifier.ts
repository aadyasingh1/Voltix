import { PendingChanges, type PendingChangeStore } from '../review/pendingChanges';
import { getWorkspaceRoot } from '../tools/pathGuard';
import { getSettings } from '../config/settings';
import { fingerprintFiles, inferVerifyCommand, runInSandbox, type SandboxFile, type SandboxResult } from './sandbox';

export interface VerificationRecord extends SandboxResult {
  fingerprint: string;
  source: 'agent' | 'auto';
}

interface VerifierState {
  lastRecord?: VerificationRecord;
  lastAgentCommand?: string;
}

/** Each store keeps its own last result, so one future can never reuse another's verification. */
const states = new WeakMap<PendingChangeStore, VerifierState>();

function stateFor(store: PendingChangeStore): VerifierState {
  let state = states.get(store);
  if (!state) {
    state = {};
    states.set(store, state);
  }
  return state;
}

export function pendingFiles(store: PendingChangeStore = PendingChanges): SandboxFile[] {
  return store.getAll().map(change => ({ path: change.path, content: change.proposedContent }));
}

export function currentFingerprint(store: PendingChangeStore = PendingChanges): string {
  return fingerprintFiles(pendingFiles(store));
}

/** The verification result for the CURRENT pending changes, if one exists. */
export function currentRecord(store: PendingChangeStore = PendingChanges): VerificationRecord | undefined {
  const { lastRecord } = stateFor(store);
  return lastRecord && lastRecord.fingerprint === currentFingerprint(store) ? lastRecord : undefined;
}

export function resetVerification(store: PendingChangeStore = PendingChanges) {
  states.delete(store);
}

/** Moves a verification result along with its changes (used when a future is chosen). */
export function copyVerification(from: PendingChangeStore, to: PendingChangeStore) {
  states.set(to, { ...stateFor(from) });
}

/** Command priority: user setting, then the command the agent chose, then an inferred one. */
export function chooseCommand(store: PendingChangeStore = PendingChanges): string | undefined {
  const configured = getSettings().verifyCommand.trim();
  if (configured) return configured;
  const { lastAgentCommand } = stateFor(store);
  if (lastAgentCommand) return lastAgentCommand;
  return inferVerifyCommand(getWorkspaceRoot(), pendingFiles(store));
}

export async function verifyPending(
  command: string,
  source: 'agent' | 'auto',
  store: PendingChangeStore = PendingChanges
): Promise<VerificationRecord> {
  const files = pendingFiles(store);
  const state = stateFor(store);
  if (source === 'agent') state.lastAgentCommand = command;
  const result = await runInSandbox(getWorkspaceRoot(), files, command);
  state.lastRecord = { ...result, fingerprint: fingerprintFiles(files), source };
  return state.lastRecord;
}

/** What the agent sees after verify_changes (kept well under TrueForge's 24,000-character tool limit). */
export function formatForAgent(record: VerificationRecord): string {
  const tail = record.output.length > 8000 ? '[...]\n' + record.output.slice(-8000) : record.output;
  return [
    `${record.passed ? 'PASSED' : 'FAILED'}: ${record.summary}`,
    `Command: ${record.command} (${(record.durationMs / 1000).toFixed(1)}s)`,
    "Ran against your PENDING edits in a sandbox copy of the workspace; the user's files were not touched.",
    '',
    'Output (tail):',
    tail || '(no output)',
  ].join('\n');
}
