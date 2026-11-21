import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ContextItem, ContextReceipt, ContextSignal } from '../../../shared/types';
import { scanFiles } from './fileScanner';
import { parseMentions } from './mentionParser';
import { rankItems } from './ranker';

export async function assembleContext(query: string, workspaceRoot: string, budget: number):
  Promise<{ items: ContextItem[]; receipt: ContextReceipt }> {
  const mentions = parseMentions(query);
  const terms = mentions.map(item => item.term);
  const words = [...new Set(query.toLowerCase().split(/\W+/).filter(word => word.length > 2))];
  const paths = await scanFiles(workspaceRoot);
  const items: ContextItem[] = [];
  for (const absPath of paths) {
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|py|pyi|json|md|rst|txt|toml|cfg|ini|yml|yaml|css|html)$/.test(absPath)) continue;
    let content = '';
    try { content = fs.readFileSync(absPath, 'utf8'); } catch { continue; }
    const lower = content.toLowerCase();
    const rel = path.relative(workspaceRoot, absPath).replace(/\\/g, '/');
    const normalizedRel = rel.toLowerCase();
    const fileMention = mentions.find(item => item.path && normalizedRel.endsWith(item.path.toLowerCase()));
    const symbolMentions = mentions.filter(item => !item.path && lower.includes(item.term.toLowerCase()));
    const contentMatches = words.filter(word => lower.includes(word));
    const pathMatches = words.filter(word => normalizedRel.includes(word));
    const signals: ContextSignal[] = [];
    if (fileMention) signals.push('explicit_mention');
    if (symbolMentions.length) signals.push('symbol_match');
    if (pathMatches.length) signals.push('filename_match');
    if (contentMatches.length) signals.push('keyword_match');
    if (signals.length === 0) continue;

    const lines = content.split(/\r?\n/);
    const firstRelevantLine = lines.findIndex(line => {
      const lineLower = line.toLowerCase();
      return symbolMentions.some(item => lineLower.includes(item.term.toLowerCase())) ||
        contentMatches.some(word => lineLower.includes(word));
    });
    const startLine = firstRelevantLine < 0
      ? 0
      : Math.max(0, Math.min(firstRelevantLine - 5, lines.length - 200));
    const endLine = Math.min(lines.length, startLine + 200) - 1;
    const excerpt = lines.slice(startLine, endLine + 1).join('\n');
    const score = Math.min(
      100,
      (fileMention ? 60 : 0) + (symbolMentions.length ? 25 : 0) + contentMatches.length * 10 + pathMatches.length * 5
    );
    items.push({
      path: rel,
      absPath,
      startLine,
      endLine,
      content: excerpt,
      signals,
      score,
      tokenEstimate: Math.ceil(excerpt.length / 4),
    });
  }
  const selected = rankItems(items, budget);
  const selectedPaths = new Set(selected.map(item => item.absPath));
  return {
    items: selected,
    receipt: {
      items: selected,
      excluded: items.length - selected.length,
      searchedCount: paths.length,
      excludedItems: items
        .filter(item => !selectedPaths.has(item.absPath))
        .map(item => ({ path: item.path, reason: 'context_budget' as const })),
      totalTokens: selected.reduce((sum, item) => sum + item.tokenEstimate, 0),
      budget,
      queryTerms: [...new Set([...terms, ...words])],
      assembledAt: Date.now(),
    },
  };
}
