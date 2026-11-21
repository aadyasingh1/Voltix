import type { ContextItem } from '../../../shared/types';
import { rankItems } from '../../src/context/ranker';

test('honors token budget', () => {
  const item = (score: number, tokenEstimate: number): ContextItem =>
    ({ path: '', absPath: '', startLine: 0, endLine: 0, content: '', signals: ['keyword_match'], score, tokenEstimate });
  expect(rankItems([item(10, 600), item(90, 300)], 500).map(value => value.score)).toEqual([90]);
});

test('pinned symbol items are ordered before automatic items', () => {
  const item = (path: string, score: number, signals: ContextItem['signals']): ContextItem =>
    ({ path, absPath: path, startLine: 0, endLine: 0, content: '', signals, score, tokenEstimate: 100 });
  const selected = rankItems([
    item('automatic.py', 100, ['keyword_match']),
    item('symbol.py', 10, ['pinned_symbol']),
  ], 200);
  expect(selected.map(value => value.path)).toEqual(['symbol.py', 'automatic.py']);
});
