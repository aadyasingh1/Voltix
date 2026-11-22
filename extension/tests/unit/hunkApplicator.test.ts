import { parseHunks } from '../../src/review/hunkParser';
import { applyHunkToText, applySelectedHunks } from '../../src/review/hunkApplicator';
import type { PendingChange } from '../../../shared/types';

function change(original: string, proposed: string): PendingChange {
  const changeId = 'test';
  return {
    id: changeId,
    path: 'test.txt',
    absPath: '/test.txt',
    originalExists: true,
    originalContent: original,
    originalHash: '',
    proposedContent: proposed,
    reason: 'test',
    hunks: parseHunks(original, proposed, changeId),
    fileDecision: null,
  };
}

test('reject all leaves original unchanged', () => {
  const value = change('one\ntwo\nthree\n', 'one\nTWO\nthree\n');
  expect(applySelectedHunks(value).content).toBe(value.originalContent);
});

test('accept all applies proposed content', () => {
  const value = change('one\ntwo\nthree\n', 'one\nTWO\nthree\n');
  value.hunks.forEach(hunk => hunk.accepted = true);
  expect(applySelectedHunks(value).content).toBe(value.proposedContent);
});

test('accept one of two hunks', () => {
  const value = change('a\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\n', 'A\nb\nc\nd\ne\nf\ng\nh\ni\nj\nK\n');
  value.hunks[0].accepted = true;
  expect(applySelectedHunks(value).content).toBe('A\nb\nc\nd\ne\nf\ng\nh\ni\nj\nk\n');
});

test('splits replacement into separate hunks', () => {
  const value = change('a\nold one\nc\nold two\ne\n', 'a\nnew one\nc\nnew two\ne\n');
  expect(value.hunks).toHaveLength(2);
});

test('applies hunk two after hunk one was rejected with original offsets', () => {
  const value = change('a\nold one\nc\nold two\ne\n', 'a\nnew one\nc\nnew two\ne\n');
  const rejectedHunk = value.hunks[0];
  const secondHunk = value.hunks[1];
  const afterReject = value.originalContent;
  expect(applyHunkToText(afterReject, secondHunk, 0)).toBe('a\nold one\nc\nnew two\ne\n');
});

test('applies hunk two after hunk one accepted with a line count change', () => {
  const value = change('a\nold\nc\nold two\ne\n', 'a\nnew one\nextra\nc\nnew two\ne\n');
  const firstHunk = value.hunks[0];
  const secondHunk = value.hunks[1];
  const afterFirst = applyHunkToText(value.originalContent, firstHunk, 0);
  const afterSecond = applyHunkToText(afterFirst, secondHunk, 1);
  expect(afterSecond).toBe('a\nnew one\nextra\nc\nnew two\ne\n');
});
