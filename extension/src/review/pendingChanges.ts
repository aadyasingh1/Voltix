import { randomUUID, createHash } from 'node:crypto';
import type { PendingChange } from '../../../shared/types';
import { parseHunks } from './hunkParser';

/** An isolated set of proposed changes. Nothing in a store is on disk until it is applied. */
export class PendingChangeStore {
  private readonly changes = new Map<string, PendingChange>();

  add(input: Omit<PendingChange, 'id' | 'hunks' | 'originalHash' | 'fileDecision'>): PendingChange {
    const id = randomUUID();
    const hunks = parseHunks(input.originalContent, input.proposedContent, id);
    const change: PendingChange = {
      ...input,
      id,
      originalHash: createHash('sha256').update(input.originalContent).digest('hex'),
      hunks,
      fileDecision: null,
    };
    this.changes.set(id, change);
    return change;
  }

  /** Takes over a change from another store, keeping its ids and original-file hash. */
  adopt(change: PendingChange): PendingChange {
    this.changes.set(change.id, change);
    return change;
  }

  getAll(): PendingChange[] {
    return [...this.changes.values()];
  }

  get(id: string): PendingChange | undefined {
    return this.changes.get(id);
  }

  clear(): void {
    this.changes.clear();
  }

  remove(id: string): boolean {
    return this.changes.delete(id);
  }

  acceptHunk(changeId: string, hunkId: string): void {
    const change = this.changes.get(changeId);
    const hunk = change?.hunks.find(item => item.id === hunkId);
    if (change && hunk) {
      change.fileDecision = null;
      hunk.accepted = true;
    }
  }

  rejectHunk(changeId: string, hunkId: string): void {
    const change = this.changes.get(changeId);
    const hunk = change?.hunks.find(item => item.id === hunkId);
    if (change && hunk) {
      change.fileDecision = null;
      hunk.accepted = false;
    }
  }

  removeHunk(changeId: string, hunkId: string): void {
    const change = this.changes.get(changeId);
    if (!change) return;
    change.hunks = change.hunks.filter(hunk => hunk.id !== hunkId);
  }

  acceptFile(changeId: string): void {
    const change = this.changes.get(changeId);
    if (change) {
      change.fileDecision = true;
      change.hunks.forEach(hunk => hunk.accepted = true);
    }
  }

  rejectFile(changeId: string): void {
    const change = this.changes.get(changeId);
    if (change) {
      change.fileDecision = false;
      change.hunks.forEach(hunk => hunk.accepted = false);
    }
  }
}

/** The default store: the normal review list used by Send, inline edit and Apply. */
export const PendingChanges = new PendingChangeStore();
