import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { assembleContext } from '../../src/context/retriever';

test('receipt records the exact relevant excerpt sent as context', async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'voltix-context-'));
  try {
    const sourcePath = path.join(workspace, 'src', 'service.ts');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    const lines = Array.from({ length: 300 }, (_, index) => `line ${index}`);
    lines[250] = 'export function TargetSymbol() {}';
    fs.writeFileSync(sourcePath, lines.join('\n'));

    const context = await assembleContext('@file:src/service.ts @symbol:TargetSymbol', workspace, 10000);

    expect(context.items).toHaveLength(1);
    expect(context.receipt.items).toEqual(context.items);
    expect(context.receipt.searchedCount).toBe(1);
    expect(context.items[0].symbolName).toBe('TargetSymbol');
    expect(context.items[0].startLine).toBe(240);
    expect(context.items[0].endLine).toBe(260);
    expect(context.items[0].content).toContain('export function TargetSymbol() {}');
    expect(context.items[0].signals).toEqual(expect.arrayContaining([
      'explicit_mention',
      'pinned_symbol',
    ]));
    expect(context.receipt.totalTokens).toBe(context.items[0].tokenEstimate);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('pins symbol range plus surrounding context before file retrieval', async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'voltix-symbol-context-'));
  try {
    const sourcePath = path.join(workspace, 'src', 'helpers.py');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    const lines = Array.from({ length: 80 }, (_, index) => 'line ' + index);
    lines[30] = 'def get_debug_flag():';
    lines[31] = '    return True';
    fs.writeFileSync(sourcePath, lines.join('\n'));

    const context = await assembleContext('@symbol:get_debug_flag @file:src/helpers.py', workspace, 1000,
      async () => ({ name: 'get_debug_flag', kind: 'function', path: 'src/helpers.py', absPath: sourcePath, startLine: 30, endLine: 31 }));

    expect(context.items[0].symbolName).toBe('get_debug_flag');
    expect(context.items[0].signals).toContain('pinned_symbol');
    expect(context.items[0].startLine).toBe(20);
    expect(context.items[0].endLine).toBe(41);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

test('receipt reports context excluded because of the token budget', async () => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'voltix-context-budget-'));
  try {
    const sourcePath = path.join(workspace, 'src', 'service.ts');
    fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
    fs.writeFileSync(sourcePath, 'export function TargetSymbol() {}\n');

    const context = await assembleContext('@symbol:TargetSymbol', workspace, 1);

    expect(context.receipt.budget).toBe(1);
    expect(context.receipt.searchedCount).toBe(1);
    expect(context.receipt.items).toEqual([]);
    expect(context.receipt.excluded).toBe(1);
    expect(context.receipt.excludedItems).toEqual([
      { path: 'src/service.ts', reason: 'over budget' },
    ]);
    expect(context.receipt.totalTokens).toBe(0);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
