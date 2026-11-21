import * as fs from 'node:fs';
import type { PendingChange } from '../../../shared/types';
import { applyAccepted } from './changeApplicator';
import { PendingChanges } from './pendingChanges';

export interface AppliedFile {
  path: string;
  absPath: string;
  originalExists: boolean;
  originalContent: string;
  appliedContent: string;
}

const history: AppliedFile[][] = [];

/** Applies accepted changes, records what was written so it can be undone, and clears applied proposals. */
export function applyAndRecord(changes: PendingChange[]) {
  const result = applyAccepted(changes);
  const batch: AppliedFile[] = [];
  for (const change of changes) {
    if (!result.applied.includes(change.path)) continue;
    let appliedContent = '';
    try { appliedContent = fs.readFileSync(change.absPath, 'utf8'); } catch { continue; }
    batch.push({
      path: change.path,
      absPath: change.absPath,
      originalExists: change.originalExists,
      originalContent: change.originalContent,
      appliedContent,
    });
    // An applied proposal is finished; later edits to this file start from the new disk content.
    PendingChanges.remove(change.id);
  }
  if (batch.length) history.push(batch);
  return result;
}

export function canUndo(): boolean {
  return history.length > 0;
}

/** Files the next undo would restore. */
export function lastAppliedFiles(): string[] {
  return history[history.length - 1]?.map(file => file.path) ?? [];
}

/**
 * Restores the files written by the most recent apply. A file that was edited after the
 * apply is left alone (and reported), so undo never overwrites the user's own work.
 */
export function undoLastApply(): { restored: string[]; skipped: string[] } {
  const batch = history.pop();
  const restored: string[] = [];
  const skipped: string[] = [];
  if (!batch) return { restored, skipped };
  for (const file of batch) {
    let current: string | undefined;
    try { current = fs.readFileSync(file.absPath, 'utf8'); } catch { current = undefined; }
    if (current !== file.appliedContent) {
      skipped.push(file.path);
      continue;
    }
    if (file.originalExists) fs.writeFileSync(file.absPath, file.originalContent);
    else fs.unlinkSync(file.absPath);
    restored.push(file.path);
  }
  return { restored, skipped };
}

export function clearUndoHistory() {
  history.length = 0;
}
