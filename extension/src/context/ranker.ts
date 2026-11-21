import type { ContextItem } from '../../../shared/types';

function pathBase(filePath: string): string {
  return filePath.split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase() || '';
}

function buildReason(item: ContextItem, score: number, topPaths: string[]): string {
  if (item.signals.includes('explicit_mention')) return '@file pinned';
  if (item.signals.includes('pinned_symbol')) return '@symbol pinned';
  if (topPaths.some(top => top && item.content.toLowerCase().includes(pathBase(top)))) {
    const top = topPaths.find(top => top && item.content.toLowerCase().includes(pathBase(top)));
    return top ? 'imports ' + (top.split('/').pop() || top) : 'imports cli.py';
  }
  if (/test|tests|_test|test_/i.test(item.path)) return 'test for cli.py';
  if (item.signals.includes('keyword_match') || item.signals.includes('filename_match')) {
    return `matches task terms (score ${score.toFixed(2)})`;
  }
  return `low score ${score.toFixed(2)}`;
}

export function rankItems(items: ContextItem[], budget: number): ContextItem[] {
  let remaining = budget;
  const selected: ContextItem[] = [];
  const pinned = items.filter(item => item.signals.includes('pinned_symbol') || item.signals.includes('explicit_mention'));
  const topPaths = pinned.length
    ? pinned.map(item => item.path)
    : [...items].sort((a, b) => b.score - a.score).slice(0, 5).map(item => item.path);
  const scored = items.map(item => {
    let score = item.score > 1 ? item.score / 100 : item.score;
    if (item.signals.includes('pinned_symbol') || item.signals.includes('explicit_mention')) score += 0.35;
    const importsTop = topPaths.some(top => top && item.content.toLowerCase().includes(pathBase(top)));
    if (importsTop) score += 0.15;
    if (/test|tests|_test|test_/i.test(item.path)) score += 0.12;
    score = Math.min(1, Math.round(score * 100) / 100);
    return { ...item, score, reason: buildReason(item, score, topPaths) };
  });
  const ordered = scored.sort((a, b) => {
    const aPinned = a.signals.includes('pinned_symbol') || a.signals.includes('explicit_mention');
    const bPinned = b.signals.includes('pinned_symbol') || b.signals.includes('explicit_mention');
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return b.score - a.score;
  });
  for (const item of ordered) {
    if (item.tokenEstimate <= remaining) {
      selected.push(item);
      remaining -= item.tokenEstimate;
    }
  }
  return selected;
}
