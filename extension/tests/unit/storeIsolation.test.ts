import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const mockRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'voltix-store-'));

jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: mockRoot } }],
    getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback }),
  },
}), { virtual: true });

import { PendingChanges, PendingChangeStore } from '../../src/review/pendingChanges';
import {
  FULL_ACCESS, FUTURE_ACCESS, READ_ONLY_ACCESS, getActiveStore, getToolPolicy, resetActiveStore, setActiveStore,
} from '../../src/review/activeStore';
import { copyVerification, currentRecord, verifyPending } from '../../src/verify/verifier';

const input = (name: string, proposedContent = 'after\n') => ({
  path: name,
  absPath: path.join(mockRoot, name),
  originalExists: true,
  originalContent: 'before\n',
  proposedContent,
  reason: 'test',
});

beforeAll(() => {
  fs.writeFileSync(path.join(mockRoot, 'package.json'), JSON.stringify({ scripts: { test: 'node check.js' } }));
  fs.writeFileSync(path.join(mockRoot, 'check.js'), "process.exit(require('./value.json').ok ? 0 : 1)\n");
  fs.writeFileSync(path.join(mockRoot, 'value.json'), '{"ok": false}');
});

afterAll(() => fs.rmSync(mockRoot, { recursive: true, force: true }));

beforeEach(() => {
  PendingChanges.clear();
  resetActiveStore();
});

test('edits in a future store never appear in the default store', () => {
  const future = new PendingChangeStore();
  const change = future.add(input('a.py'));
  expect(future.getAll()).toHaveLength(1);
  expect(PendingChanges.getAll()).toHaveLength(0);
  expect(PendingChanges.get(change.id)).toBeUndefined();
  PendingChanges.clear();
  expect(future.getAll()).toHaveLength(1);
});

test('two future stores are isolated from each other', () => {
  const a = new PendingChangeStore();
  const b = new PendingChangeStore();
  a.add(input('same.py', 'from A\n'));
  b.add(input('same.py', 'from B\n'));
  expect(a.getAll()[0].proposedContent).toBe('from A\n');
  expect(b.getAll()[0].proposedContent).toBe('from B\n');
});

test('adopt keeps ids so hunk review works after a future is chosen', () => {
  const future = new PendingChangeStore();
  const change = future.add(input('chosen.py'));
  PendingChanges.adopt(change);
  PendingChanges.acceptHunk(change.id, change.hunks[0].id);
  expect(PendingChanges.get(change.id)?.hunks[0].accepted).toBe(true);
  expect(PendingChanges.get(change.id)?.originalHash).toBe(change.originalHash);
});

test('the active store and tool policy default to the normal review list and reset', () => {
  expect(getActiveStore()).toBe(PendingChanges);
  expect(getToolPolicy()).toBe(FULL_ACCESS);
  const future = new PendingChangeStore();
  setActiveStore(future, FUTURE_ACCESS);
  expect(getActiveStore()).toBe(future);
  expect(getToolPolicy().allowCommands).toBe(false);
  setActiveStore(new PendingChangeStore(), READ_ONLY_ACCESS);
  expect(getToolPolicy().allowEdits).toBe(false);
  resetActiveStore();
  expect(getActiveStore()).toBe(PendingChanges);
  expect(getToolPolicy()).toBe(FULL_ACCESS);
});

test('verification records are kept per store and follow an adopted change', async () => {
  const passing = new PendingChangeStore();
  passing.add({ ...input('value.json', '{"ok": true}'), originalContent: '{"ok": false}' });
  const failing = new PendingChangeStore();
  failing.add({ ...input('value.json', '{"ok": false, "x": 1}'), originalContent: '{"ok": false}' });

  expect((await verifyPending('npm test --silent', 'auto', passing)).passed).toBe(true);
  expect((await verifyPending('npm test --silent', 'auto', failing)).passed).toBe(false);
  expect(currentRecord(passing)?.passed).toBe(true);
  expect(currentRecord(failing)?.passed).toBe(false);
  expect(currentRecord()?.passed).toBeUndefined();

  passing.getAll().forEach(change => PendingChanges.adopt(change));
  copyVerification(passing, PendingChanges);
  expect(currentRecord()?.passed).toBe(true);
  expect(fs.readFileSync(path.join(mockRoot, 'value.json'), 'utf8')).toBe('{"ok": false}');
}, 60000);
