import { createTwoFilesPatch, parsePatch } from 'diff';
import type { Hunk } from '../../../shared/types';

export function normalizeLineEndings(content: string): { normalized: string; wasCRLF: boolean } {
  const wasCRLF = content.includes('\r\n');
  return { normalized: content.replace(/\r\n/g, '\n'), wasCRLF };
}

export function restoreLineEndings(content: string, wasCRLF: boolean): string {
  return wasCRLF ? content.replace(/\n/g, '\r\n') : content;
}

export function parseHunks(original: string, proposed: string, changeId: string): Hunk[] {
  const originalNormalized = normalizeLineEndings(original).normalized;
  const proposedNormalized = normalizeLineEndings(proposed).normalized;
  if (originalNormalized === proposedNormalized) return [];
  const patch = createTwoFilesPatch('a', 'b', originalNormalized, proposedNormalized, '', '', { context: 0 });
  const parsed = parsePatch(patch);
  if (!parsed.length || !parsed[0].hunks) return [];
  return parsed[0].hunks.map((parsedHunk, index) => ({
    id: `${changeId}-hunk-${index}`,
    changeId,
    header: `@@ -${parsedHunk.oldStart}${parsedHunk.oldLines === 1 ? '' : ',' + parsedHunk.oldLines} +${parsedHunk.newStart}${parsedHunk.newLines === 1 ? '' : ',' + parsedHunk.newLines} @@`,
    originalStart: parsedHunk.oldStart,
    originalCount: parsedHunk.oldLines,
    proposedStart: parsedHunk.newStart,
    proposedCount: parsedHunk.newLines,
    // Skip diff metadata like "\ No newline at end of file", which is not file content.
    lines: parsedHunk.lines.filter(line => !line.startsWith('\\')).map(line => ({
      type: line.startsWith('+') ? 'add' : line.startsWith('-') ? 'remove' : 'context',
      content: line.slice(1),
    })),
    accepted: null,
  }));
}
