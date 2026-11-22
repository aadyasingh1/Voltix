import { PendingChanges, type PendingChangeStore } from './pendingChanges';

/** What the agent's MCP tools may do for the run that currently owns the active store. */
export interface ToolPolicy {
  allowEdits: boolean;
  allowCommands: boolean;
  allowVerify: boolean;
}

export const FULL_ACCESS: ToolPolicy = { allowEdits: true, allowCommands: true, allowVerify: true };
/** run_command executes in the real workspace, so a future may only test through the sandbox. */
export const FUTURE_ACCESS: ToolPolicy = { allowEdits: true, allowCommands: false, allowVerify: true };
/** Planning and the Regret Check may read the code but never change or run anything. */
export const READ_ONLY_ACCESS: ToolPolicy = { allowEdits: false, allowCommands: false, allowVerify: false };

let activeStore: PendingChangeStore = PendingChanges;
let activePolicy: ToolPolicy = FULL_ACCESS;

export function getActiveStore(): PendingChangeStore {
  return activeStore;
}

export function getToolPolicy(): ToolPolicy {
  return activePolicy;
}

export function setActiveStore(store: PendingChangeStore, policy: ToolPolicy = FULL_ACCESS): void {
  activeStore = store;
  activePolicy = policy;
}

export function resetActiveStore(): void {
  setActiveStore(PendingChanges, FULL_ACCESS);
}
