import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const mockRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'voltix-futures-')));
const mockSettings: Record<string, unknown> = {};

jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: mockRoot } }],
    getConfiguration: () => ({
      get: (key: string, fallback: unknown) => (key in mockSettings ? mockSettings[key] : fallback),
    }),
  },
  window: { createOutputChannel: () => ({ appendLine: () => undefined }) },
}), { virtual: true });
jest.mock('../../src/agent/session', () => ({ createSession: jest.fn() }));
jest.mock('../../src/agent/streamProcessor', () => ({ processTurn: jest.fn() }));
jest.mock('../../src/context/retriever', () => ({
  assembleContext: jest.fn(async () => ({
    items: [],
    receipt: { items: [], excluded: 0, totalTokens: 0, budget: 0, queryTerms: [], assembledAt: 0 },
  })),
}));

import { createSession } from '../../src/agent/session';
import { processTurn } from '../../src/agent/streamProcessor';
import { buildComparison, findNewImports } from '../../src/futures/evidence';
import { FuturesEngine } from '../../src/futures/futuresEngine';
import { extractJsonObject } from '../../src/futures/json';
import { parseStrategies } from '../../src/futures/strategyPlanner';
import { FULL_ACCESS, getActiveStore, getToolPolicy, resetActiveStore } from '../../src/review/activeStore';
import { PendingChanges, PendingChangeStore } from '../../src/review/pendingChanges';
import { currentRecord, resetVerification } from '../../src/verify/verifier';
import { runProbeInSandbox, validateProbeCommand } from '../../src/verify/sandbox';
import type { FutureEvidence, PanelOutboundMessage } from '../../../shared/types';

const PLAN = JSON.stringify({
  strategies: [
    { id: 'A', title: 'Inline it', approach: 'Change the value directly.', tradeoff: 'Small.' },
    { id: 'B', title: 'Add a helper', approach: 'Route it through a helper.', tradeoff: 'Bigger.' },
  ],
});

const evidence = (overrides: Partial<FutureEvidence> = {}): FutureEvidence => ({
  futureId: 'A',
  strategy: { id: 'A', title: 'x', approach: 'y', tradeoff: 'z' },
  status: 'completed',
  tests: { ran: true, passed: true, summary: '3 passed' },
  fixRounds: 0,
  filesChanged: ['a.py'],
  added: 5,
  removed: 1,
  newImports: [],
  risk: 'low',
  flags: [],
  blastRadius: 1,
  probe: null,
  durationMs: 1000,
  model: 'm',
  ...overrides,
});

describe('parseStrategies', () => {
  it('reads plain, fenced and prose-wrapped JSON', () => {
    expect(parseStrategies(PLAN)?.map(item => item.id)).toEqual(['A', 'B']);
    expect(parseStrategies('```json\n' + PLAN + '\n```')?.[1].title).toBe('Add a helper');
    expect(parseStrategies('I read {the code}. Here it is: ' + PLAN + ' Done.')?.[0].title).toBe('Inline it');
  });
  it('handles braces inside strings', () => {
    const plan = JSON.stringify({ strategies: [
      { title: 'Use {} syntax', approach: 'Format with "{}".' },
      { title: 'Other', approach: 'Different.' },
    ] });
    expect(parseStrategies(plan)?.[0].title).toBe('Use {} syntax');
  });
  it('rejects unusable plans', () => {
    expect(parseStrategies('no json')).toBeNull();
    expect(parseStrategies('{"strategies":[{"title":"Only one","approach":"x"}]}')).toBeNull();
    expect(parseStrategies('{"strategies":[{"title":"Same","approach":"x"},{"title":"same","approach":"y"}]}')).toBeNull();
    expect(extractJsonObject('{"other":1}', 'strategies')).toBeNull();
  });
});

describe('buildComparison', () => {
  const row = (rows: ReturnType<typeof buildComparison>, key: string) => rows.find(item => item.key === key)!;

  it('marks the better value per row', () => {
    const rows = buildComparison(
      evidence({ added: 3, removed: 0, risk: 'medium', fixRounds: 1, tests: { ran: true, passed: false, summary: '1 failed' } }),
      evidence({ futureId: 'B', added: 20, removed: 2, risk: 'low', fixRounds: 0 })
    );
    expect(row(rows, 'lines').better).toBe('A');
    expect(row(rows, 'risk').better).toBe('B');
    expect(row(rows, 'fixRounds').better).toBe('B');
    expect(row(rows, 'tests').better).toBe('B');
    expect(row(rows, 'files').better).toBeNull();
    expect(row(rows, 'model').better).toBeNull();
  });

  it('never marks a failed future as better because it changed less', () => {
    const rows = buildComparison(
      evidence({ status: 'failed', filesChanged: [], added: 0, removed: 0, tests: { ran: false, passed: false, summary: 'Not run' } }),
      evidence({ futureId: 'B' })
    );
    expect(rows.every(item => item.better === null)).toBe(true);
  });

  it('compares probes only when both ran', () => {
    const ok = { command: 'node x', exitCode: 0, passed: true, timedOut: false, output: '' };
    const bad = { ...ok, exitCode: 1, passed: false };
    expect(row(buildComparison(evidence({ probe: ok }), evidence({ futureId: 'B', probe: bad })), 'probe').better).toBe('A');
    expect(row(buildComparison(evidence({ probe: ok }), evidence({ futureId: 'B' })), 'probe').better).toBeNull();
  });
});

describe('findNewImports', () => {
  it('finds added imports in code and ignores existing lines and docs', () => {
    const store = new PendingChangeStore();
    store.add({ path: 'a.py', absPath: '/a.py', originalExists: true, originalContent: 'import os\n', proposedContent: 'import os\nimport json\nfrom x import y\n', reason: '' });
    store.add({ path: 'doc.rst', absPath: '/doc.rst', originalExists: true, originalContent: 'text\n', proposedContent: 'text\nimport this in a doc\n', reason: '' });
    expect(findNewImports(store.getAll())).toEqual(['import json', 'from x import y']);
  });
});

describe('validateProbeCommand', () => {
  it('allows the supported runners', () => {
    for (const command of ['flask --app /tmp/hello.py config', 'python -c "print(1)"', 'python3 x.py', 'node x.js', 'pytest -q', 'npm test', 'npm run smoke']) {
      expect(validateProbeCommand(command)).toBeUndefined();
    }
  });
  it('rejects chaining and other programs', () => {
    for (const command of ['flask config && rm -rf .', 'python x.py > out', 'node x | cat', 'python $(whoami)', 'rm -rf .', 'npm install', 'pythonx y', 'curl example.com']) {
      expect(validateProbeCommand(command)).toBeDefined();
    }
  });
});

describe('FuturesEngine', () => {
  const session = { client: { sessions: { cancel: jest.fn(async () => undefined) } }, sessionId: 's' };
  let messages: PanelOutboundMessage[];
  let engine: FuturesEngine;
  const of = <T extends PanelOutboundMessage['type']>(type: T) =>
    messages.filter(item => item.type === type) as Extract<PanelOutboundMessage, { type: T }>[];

  /** Stands in for the model: planning returns JSON, implementation edits through the active store. */
  const fakeModel = (contentFor: (prompt: string) => string) => async (_c: unknown, _s: string, prompt: string, emit: (m: PanelOutboundMessage) => void) => {
    if (prompt.startsWith('Plan two')) {
      emit({ type: 'text_done', fullContent: PLAN });
      return { status: 'done' as const };
    }
    getActiveStore().add({
      path: 'value.json',
      absPath: path.join(mockRoot, 'value.json'),
      originalExists: true,
      originalContent: '{"ok": false}',
      proposedContent: contentFor(prompt),
      reason: 'test',
    });
    emit({ type: 'tool_start', id: 't1', name: 'edit_file', argsPreview: '' });
    emit({ type: 'text_delta', content: 'should stay out of the main response' });
    emit({ type: 'turn_done', status: 'done' });
    return { status: 'done' as const };
  };

  beforeAll(() => {
    fs.writeFileSync(path.join(mockRoot, 'package.json'), JSON.stringify({ scripts: { test: 'node check.js' } }));
    fs.writeFileSync(path.join(mockRoot, 'check.js'), "process.exit(require('./value.json').ok ? 0 : 1)\n");
    fs.writeFileSync(path.join(mockRoot, 'value.json'), '{"ok": false}');
  });
  afterAll(() => fs.rmSync(mockRoot, { recursive: true, force: true }));

  beforeEach(() => {
    PendingChanges.clear();
    resetVerification();
    resetActiveStore();
    messages = [];
    mockSettings.model = 'test/model';
    mockSettings.fallbackModels = [];
    mockSettings['verify.maxFixRounds'] = 0;
    (createSession as jest.Mock).mockReset().mockResolvedValue(session);
    (processTurn as jest.Mock).mockReset();
    engine = new FuturesEngine(message => messages.push(message), () => undefined);
  });

  it('builds two isolated futures and moves only the chosen one into review', async () => {
    (processTurn as jest.Mock).mockImplementation(fakeModel(prompt =>
      prompt.includes('Inline it') ? '{"ok": true}' : '{"ok": false, "b": 1}'));
    await engine.explore('make it ok', 'node check.js');

    expect(PendingChanges.getAll()).toHaveLength(0);
    expect(getActiveStore()).toBe(PendingChanges);
    expect(getToolPolicy()).toBe(FULL_ACCESS);
    expect(fs.readFileSync(path.join(mockRoot, 'value.json'), 'utf8')).toBe('{"ok": false}');
    expect(of('pending_change')).toHaveLength(0);
    expect(of('text_delta')).toHaveLength(0);
    expect(of('turn_done')).toHaveLength(0);
    expect(of('tool_start').map(item => item.name)).toEqual(['[A] edit_file', '[B] edit_file']);

    const [a, b] = of('future_result');
    expect(a.evidence.tests.passed).toBe(true);
    expect(a.evidence.probe?.passed).toBe(true);
    expect(b.evidence.tests.passed).toBe(false);
    expect(b.evidence.probe?.passed).toBe(false);
    expect(of('futures_compare')[0].rows.find(row => row.key === 'tests')?.better).toBe('A');

    await engine.choose('A');
    expect(PendingChanges.getAll().map(change => change.proposedContent)).toEqual(['{"ok": true}']);
    expect(currentRecord()?.passed).toBe(true);
    expect(of('futures_chosen')[0]).toMatchObject({ futureId: 'A', otherId: 'B' });
    expect(fs.readFileSync(path.join(mockRoot, 'value.json'), 'utf8')).toBe('{"ok": false}');
    await expect(engine.choose('B')).rejects.toThrow(/no longer available/);
  }, 60000);

  it('reports a planning failure without leaving anything behind', async () => {
    (createSession as jest.Mock).mockRejectedValue(new Error('401 invalid key'));
    await expect(engine.explore('task')).rejects.toThrow(/401 invalid key/);
    expect(engine.busy).toBe(false);
    expect(getActiveStore()).toBe(PendingChanges);
    expect(PendingChanges.getAll()).toHaveLength(0);
  });

  it('refuses to start over existing proposals or with an unsafe probe', async () => {
    await expect(engine.explore('task', 'rm -rf .')).rejects.toThrow(/Probe commands/);
    PendingChanges.add({ path: 'x', absPath: '/x', originalExists: true, originalContent: 'a', proposedContent: 'b', reason: '' });
    await expect(engine.explore('task')).rejects.toThrow(/Apply or discard/);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('cancel stops the run and restores the default store', async () => {
    (processTurn as jest.Mock).mockImplementation(async (_c: unknown, _s: string, prompt: string, emit: (m: PanelOutboundMessage) => void) => {
      if (prompt.startsWith('Plan two')) {
        emit({ type: 'text_done', fullContent: PLAN });
        return { status: 'done' };
      }
      await engine.cancel();
      return { status: 'cancelled' };
    });
    await engine.explore('task');
    expect(session.client.sessions.cancel).toHaveBeenCalled();
    expect(of('future_result')).toHaveLength(0);
    expect(of('futures_cleared')).toHaveLength(1);
    expect(of('turn_done')[0].status).toBe('cancelled');
    expect(getActiveStore()).toBe(PendingChanges);
    expect(PendingChanges.getAll()).toHaveLength(0);
  });

  it('keeps the other future when one fails, and blocks choosing the failed one', async () => {
    let calls = 0;
    (processTurn as jest.Mock).mockImplementation(async (c: unknown, s: string, prompt: string, emit: (m: PanelOutboundMessage) => void) => {
      if (!prompt.startsWith('Plan two') && ++calls === 1) return { status: 'error', message: 'model died' };
      return fakeModel(() => '{"ok": true}')(c, s, prompt, emit);
    });
    await engine.explore('task');
    expect(of('future_result').map(item => item.evidence.status)).toEqual(['failed', 'completed']);
    await expect(engine.choose('A')).rejects.toThrow(/no usable changes/);
    await engine.choose('B');
    expect(PendingChanges.getAll()).toHaveLength(1);
  }, 60000);
});

describe('runProbeInSandbox', () => {
  it('runs against pending content and keeps only the output tail', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'voltix-probe-'));
    try {
      fs.writeFileSync(path.join(root, 'p.js'), "console.log('x'.repeat(5000) + 'old')\n");
      const result = await runProbeInSandbox(root, [{ path: 'p.js', content: "console.log('x'.repeat(5000) + 'new')\n" }], 'node p.js');
      expect(result.passed).toBe(true);
      expect(result.output.length).toBeLessThanOrEqual(3000);
      expect(result.output).toContain('new');
      expect(fs.readFileSync(path.join(root, 'p.js'), 'utf8')).toContain('old');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }, 30000);
});
