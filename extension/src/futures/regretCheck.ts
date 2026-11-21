import type { FutureEvidence } from '../../../shared/types';
import { extractJsonObject } from './json';
import { runOnModelChain, type ModelRunOptions } from './modelRunner';

export interface RegretCheck {
  gain: string[];
  giveUp: string[];
  regretIf: string[];
  /** 'evidence' means the bullets were derived from the numbers because the model gave no usable answer. */
  source: 'model' | 'evidence';
}

const MAX_BULLETS = 3;

function bullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, MAX_BULLETS);
}

export function parseRegret(output: string): Omit<RegretCheck, 'source'> | null {
  const parsed = extractJsonObject(output, 'regretIf');
  if (!parsed) return null;
  const result = { gain: bullets(parsed.gain), giveUp: bullets(parsed.giveUp), regretIf: bullets(parsed.regretIf) };
  return result.gain.length && result.giveUp.length && result.regretIf.length ? result : null;
}

/**
 * The evidence sent to the model. Probe output is left out on purpose: a probe can print
 * configuration, and a future whose masking is broken must not leak those values to a provider.
 */
export function evidenceForModel(evidence: FutureEvidence) {
  return {
    future: evidence.futureId,
    title: evidence.strategy.title,
    approach: evidence.strategy.approach,
    tradeoff: evidence.strategy.tradeoff,
    tests: { ran: evidence.tests.ran, passed: evidence.tests.passed, summary: evidence.tests.summary },
    fixRounds: evidence.fixRounds,
    filesChanged: evidence.filesChanged,
    linesAdded: evidence.added,
    linesRemoved: evidence.removed,
    newImports: evidence.newImports,
    risk: evidence.risk,
    riskFlags: evidence.flags,
    dependentFiles: evidence.blastRadius,
    probe: evidence.probe ? { passed: evidence.probe.passed, exitCode: evidence.probe.exitCode, timedOut: evidence.probe.timedOut } : null,
    durationSeconds: Math.round(evidence.durationMs / 1000),
  };
}

export function buildRegretPrompt(chosen: FutureEvidence, other: FutureEvidence): string {
  return [
    `The user chose Future ${chosen.futureId} over Future ${other.futureId}. Write a short Regret Check.`,
    'Do not call any tools. Use ONLY the evidence below and do not invent numbers, performance claims or effort estimates.',
    'Reply ONLY with JSON: {"gain":["3 short bullets"],"giveUp":["3 short bullets"],"regretIf":["3 concrete trigger conditions, like: you later need YAML output"]}.',
    '',
    `Chosen: ${JSON.stringify(evidenceForModel(chosen))}`,
    `Other: ${JSON.stringify(evidenceForModel(other))}`,
  ].join('\n');
}

/** Bullets built only from measured values, used when the model gives no usable answer. */
export function deriveRegret(chosen: FutureEvidence, other: FutureEvidence): Omit<RegretCheck, 'source'> {
  const rank = { low: 0, medium: 1, high: 2 };
  const size = (item: FutureEvidence) => item.added + item.removed;
  const otherUsable = other.status === 'completed' && other.filesChanged.length > 0;
  const gain: string[] = [];
  const giveUp: string[] = [];
  const regretIf: string[] = [];

  if (chosen.tests.ran && chosen.tests.passed) gain.push(`Tests pass: ${chosen.tests.summary}`);
  if (otherUsable) {
    if (size(chosen) < size(other)) gain.push(`Smaller diff: ${size(chosen)} changed lines vs ${size(other)}`);
    else if (size(chosen) > size(other)) giveUp.push(`A smaller diff: ${size(other)} changed lines vs ${size(chosen)}`);
    if (rank[chosen.risk] < rank[other.risk]) gain.push(`Lower risk: ${chosen.risk} vs ${other.risk}`);
    else if (rank[chosen.risk] > rank[other.risk]) giveUp.push(`Lower risk: ${other.risk} vs ${chosen.risk}`);
    if (chosen.blastRadius < other.blastRadius) gain.push(`Fewer dependent files: ${chosen.blastRadius} vs ${other.blastRadius}`);
    else if (chosen.blastRadius > other.blastRadius) giveUp.push(`Fewer dependent files: ${other.blastRadius} vs ${chosen.blastRadius}`);
    if (other.tests.ran && other.tests.passed && !(chosen.tests.ran && chosen.tests.passed)) {
      giveUp.push(`Passing tests: ${other.tests.summary}`);
    }
  }
  if (!gain.length) gain.push(`The "${chosen.strategy.title}" design`);
  giveUp.push(`The "${other.strategy.title}" design`);

  if (chosen.tests.ran && !chosen.tests.passed) regretIf.push(`The failing tests point to a real bug (${chosen.tests.summary})`);
  if (!chosen.tests.ran) regretIf.push('A bug appears that tests would have caught, because tests were not run');
  if (chosen.probe && !chosen.probe.passed) regretIf.push(`The failed probe reflects real behaviour (${chosen.probe.command})`);
  if (chosen.blastRadius > 0) regretIf.push(`The change breaks one of the ${chosen.blastRadius} file(s) that import the changed code`);
  if (chosen.newImports.length) regretIf.push(`A new import causes a problem: ${chosen.newImports[0]}`);
  if (chosen.strategy.tradeoff) regretIf.push(`This trade-off starts to matter: ${chosen.strategy.tradeoff}`);
  regretIf.push(`You later need what "${other.strategy.title}" offered`);

  return { gain: gain.slice(0, MAX_BULLETS), giveUp: giveUp.slice(0, MAX_BULLETS), regretIf: regretIf.slice(0, MAX_BULLETS) };
}

/** Never throws: a model failure must not stop the user from taking the future they chose. */
export async function runRegretCheck(
  chosen: FutureEvidence,
  other: FutureEvidence,
  options: ModelRunOptions
): Promise<RegretCheck> {
  try {
    const result = await runOnModelChain(buildRegretPrompt(chosen, other), options);
    const parsed = result.status === 'done' ? parseRegret(result.text) : null;
    if (parsed) return { ...parsed, source: 'model' };
  } catch { /* fall through to the evidence-based bullets */ }
  return { ...deriveRegret(chosen, other), source: 'evidence' };
}
