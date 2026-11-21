import { applyPatch } from 'diff';
import type { Hunk, PendingChange } from '../../../shared/types';
import { normalizeLineEndings, restoreLineEndings } from './hunkParser';

export function buildPatch(change: PendingChange): string {
  const original = normalizeLineEndings(change.originalContent).normalized;
  const proposed = normalizeLineEndings(change.proposedContent).normalized;
  return require('diff').createTwoFilesPatch('a', 'b', original, proposed, '', '', { context: 3 });
}

export function applyHunkToText(content: string, hunk: Hunk, appliedLineDelta = 0): string {
  const info = normalizeLineEndings(content);
  const lines = info.normalized.split('\n');
  const start = Math.max(0, hunk.originalStart - 1 + appliedLineDelta);
  const removeCount = hunk.lines.filter(line => line.type === 'remove').length;
  const replacements = hunk.lines.filter(line => line.type === 'add').map(line => line.content);
  lines.splice(start, removeCount, ...replacements);
  return restoreLineEndings(lines.join('\n'), info.wasCRLF);
}

export function applySelectedHunks(change: PendingChange):
  { content: string | null; error?: string } {
  const selected = change.hunks.filter(hunk => hunk.accepted === true);
  if (selected.length === 0) return { content: change.originalContent };
  const originalInfo = normalizeLineEndings(change.originalContent);
  const lines = originalInfo.normalized.split('\n');
  let result = originalInfo.normalized;
  const ordered = [...selected].sort((a, b) => b.originalStart - a.originalStart);
  for (const hunk of ordered) {
    const contextPrefix = hunk.lines.findIndex(line => line.type !== 'context');
    const start = hunk.originalStart - 1 + Math.max(0, contextPrefix);
    const firstChanged = hunk.lines.findIndex(line => line.type !== 'context');
    const removeCount = hunk.lines
      .slice(firstChanged >= 0 ? firstChanged : 0)
      .filter(line => line.type !== 'add').length;
    const replacements = hunk.lines
      .slice(firstChanged >= 0 ? firstChanged : 0)
      .filter(line => line.type !== 'remove')
      .map(line => line.content);
    const originalLines = result.split('\n');
    originalLines.splice(start, removeCount, ...replacements);
    result = originalLines.join('\n');
  }
  return { content: restoreLineEndings(result, originalInfo.wasCRLF) };
}
