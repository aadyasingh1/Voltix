import type { ContextSignal } from '../../../shared/types';

export function parseMentions(text: string): { term: string; path?: string; signal: ContextSignal }[] {
  const mentions: { term: string; path?: string; signal: ContextSignal }[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(/@(?:file:([^\s]+)|symbol:([^\s]+))/g)) {
    const file = match[1];
    const symbol = match[2];
    if (file) {
      const key = 'file:' + file;
      if (!seen.has(key)) {
        seen.add(key);
        mentions.push({ term: file, path: file, signal: 'explicit_mention' });
      }
    } else if (symbol) {
      const key = 'symbol:' + symbol;
      if (!seen.has(key)) {
        seen.add(key);
        mentions.push({ term: symbol, signal: 'pinned_symbol' });
      }
    }
  }
  return mentions;
}
