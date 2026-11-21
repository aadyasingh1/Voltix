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
    expect(context.items[0].startLine).toBe(100);
    expect(context.items[0].endLine).toBe(299);
    expect(context.items[0].content).toContain('export function TargetSymbol() {}');
    expect(context.items[0].signals).toEqual(expect.arrayContaining([
      'explicit_mention',
      'symbol_match',
      'filename_match',
      'keyword_match',
    ]));
    expect(context.receipt.totalTokens).toBe(context.items[0].tokenEstimate);
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
      { path: 'src/service.ts', reason: 'context_budget' },
    ]);
    expect(context.receipt.totalTokens).toBe(0);
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});
