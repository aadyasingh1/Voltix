import type { FutureId, FutureStrategy } from '../../../shared/types';
import { extractJsonObject } from './json';
import { runOnModelChain, type ModelRunOptions } from './modelRunner';

const IDS: FutureId[] = ['A', 'B'];

export const FALLBACK_STRATEGIES: FutureStrategy[] = [
  {
    id: 'A',
    title: 'Minimal change',
    approach: 'Make the smallest change that satisfies the task, reusing the existing code paths and adding no new abstractions.',
    tradeoff: 'Smallest diff, but later extensions may need more rework.',
  },
  {
    id: 'B',
    title: 'Extensible design',
    approach: 'Introduce a small, well-named helper or abstraction around the new behaviour so that related changes can reuse it.',
    tradeoff: 'Easier to extend later, at the cost of more code to review now.',
  },
];

const text = (value: unknown, limit: number) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');

/** Returns exactly two distinct strategies from model output, or null if it has no usable plan. */
export function parseStrategies(output: string): FutureStrategy[] | null {
  const parsed = extractJsonObject(output, 'strategies');
  if (!parsed || !Array.isArray(parsed.strategies)) return null;
  const strategies = parsed.strategies
    .map(item => {
      const value = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      return {
        title: text(value.title, 100),
        approach: text(value.approach, 700),
        tradeoff: text(value.tradeoff, 300),
      };
    })
    .filter(item => item.title && item.approach)
    .slice(0, 2);
  if (strategies.length < 2) return null;
  if (strategies[0].title.toLowerCase() === strategies[1].title.toLowerCase()) return null;
  return strategies.map((item, index) => ({ id: IDS[index], ...item }));
}

export function buildPlanningPrompt(task: string, context: string): string {
  return [
    'Plan two different ways to implement this task.',
    '',
    `Task: ${task}`,
    '',
    'Inspect the code with search_workspace/read_file if needed but DO NOT edit anything.',
    'Reply ONLY with JSON: {"strategies":[{"id":"A","title":"...","approach":"2-3 sentences","tradeoff":"1 sentence"},{"id":"B","title":"...","approach":"2-3 sentences","tradeoff":"1 sentence"}]}.',
    'The two strategies must differ in design, not just style.',
    '',
    'Selected workspace context:',
    context,
  ].join('\n');
}

export interface PlanResult {
  status: 'done' | 'cancelled' | 'error';
  strategies: FutureStrategy[];
  usedFallback: boolean;
  message?: string;
}

export async function planStrategies(task: string, context: string, options: ModelRunOptions): Promise<PlanResult> {
  const result = await runOnModelChain(buildPlanningPrompt(task, context), options);
  if (result.status !== 'done') {
    return { status: result.status, strategies: [], usedFallback: false, message: result.message };
  }
  const strategies = parseStrategies(result.text);
  return {
    status: 'done',
    strategies: strategies ?? FALLBACK_STRATEGIES.map(item => ({ ...item })),
    usedFallback: !strategies,
  };
}
