import type { ContextItem } from '../../../shared/types';

export function rankItems(items: ContextItem[], budget: number): ContextItem[] {
  let remaining = budget;
  const selected: ContextItem[] = [];
  const ordered = [...items].sort((a, b) => {
    const aPinned = a.signals.includes('pinned_symbol');
    const bPinned = b.signals.includes('pinned_symbol');
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
