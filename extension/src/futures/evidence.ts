import type {
  ChangePassport, ComparisonRow, FutureEvidence, FutureId, FutureProbeResult, FutureStrategy, PendingChange, RiskLevel,
} from '../../../shared/types';

const CODE_FILE = /\.(py|pyi|ts|tsx|js|jsx|mjs|cjs)$/i;
const IMPORT_LINE = /^\s*(import\s+\S|from\s+\S+\s+import\b)/;
const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

/** Import lines the change adds that were not already in the original file. Docs are ignored. */
export function findNewImports(changes: PendingChange[]): string[] {
  const found = new Set<string>();
  for (const change of changes) {
    if (!CODE_FILE.test(change.path)) continue;
    const original = new Set(change.originalContent.split(/\r?\n/).map(line => line.trim()));
    for (const hunk of change.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add' && IMPORT_LINE.test(line.content) && !original.has(line.content.trim())) {
          found.add(line.content.trim());
        }
      }
    }
  }
  return [...found];
}

export interface EvidenceInput {
  strategy: FutureStrategy;
  status: FutureEvidence['status'];
  error?: string;
  changes: PendingChange[];
  passport: ChangePassport | null;
  tests: FutureEvidence['tests'];
  fixRounds: number;
  probe: FutureProbeResult | null;
  durationMs: number;
  model?: string;
}

export function buildEvidence(input: EvidenceInput): FutureEvidence {
  let added = 0;
  let removed = 0;
  for (const change of input.changes) {
    for (const hunk of change.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') added++;
        else if (line.type === 'remove') removed++;
      }
    }
  }
  return {
    futureId: input.strategy.id,
    strategy: input.strategy,
    status: input.status,
    error: input.error,
    tests: input.tests,
    fixRounds: input.fixRounds,
    filesChanged: input.changes.map(change => change.path),
    added,
    removed,
    newImports: findNewImports(input.changes),
    risk: input.passport?.risk ?? 'low',
    flags: input.passport?.files.flatMap(file => file.flags.map(flag => flag.message)) ?? [],
    blastRadius: input.passport?.totals.dependents ?? 0,
    probe: input.probe,
    durationMs: input.durationMs,
    model: input.model,
  };
}

const lower = (a: number, b: number): FutureId | null => (a === b ? null : a < b ? 'A' : 'B');
const preferTrue = (a: boolean, b: boolean): FutureId | null => (a === b ? null : a ? 'A' : 'B');

function testsLabel(evidence: FutureEvidence): string {
  if (!evidence.tests.ran) return 'Not run';
  return `${evidence.tests.passed ? 'Pass' : 'Fail'}: ${evidence.tests.summary}`;
}

function probeLabel(evidence: FutureEvidence): string {
  if (!evidence.probe) return 'Not run';
  if (evidence.probe.timedOut) return 'Timed out';
  return `${evidence.probe.passed ? 'OK' : 'Failed'} (exit ${evidence.probe.exitCode})`;
}

/**
 * Side-by-side rows with the better value marked. A failed or empty future is never marked better:
 * "0 lines changed" is not an advantage when nothing was implemented.
 */
export function buildComparison(a: FutureEvidence, b: FutureEvidence): ComparisonRow[] {
  const usable = (item: FutureEvidence) => item.status === 'completed' && item.filesChanged.length > 0;
  const comparable = usable(a) && usable(b);
  const when = (better: FutureId | null) => (comparable ? better : null);
  const bothProbed = Boolean(a.probe && b.probe);

  return [
    { key: 'tests', label: 'Tests', a: testsLabel(a), b: testsLabel(b), better: when(a.tests.ran && b.tests.ran ? preferTrue(a.tests.passed, b.tests.passed) : null) },
    { key: 'fixRounds', label: 'Fix rounds', a: String(a.fixRounds), b: String(b.fixRounds), better: when(lower(a.fixRounds, b.fixRounds)) },
    { key: 'files', label: 'Files', a: String(a.filesChanged.length), b: String(b.filesChanged.length), better: when(lower(a.filesChanged.length, b.filesChanged.length)) },
    { key: 'lines', label: '+/− lines', a: `+${a.added} / −${a.removed}`, b: `+${b.added} / −${b.removed}`, better: when(lower(a.added + a.removed, b.added + b.removed)) },
    { key: 'imports', label: 'New imports', a: String(a.newImports.length), b: String(b.newImports.length), better: when(lower(a.newImports.length, b.newImports.length)) },
    { key: 'blast', label: 'Blast radius', a: `${a.blastRadius} file(s)`, b: `${b.blastRadius} file(s)`, better: when(lower(a.blastRadius, b.blastRadius)) },
    { key: 'risk', label: 'Risk', a: a.risk, b: b.risk, better: when(lower(RISK_RANK[a.risk], RISK_RANK[b.risk])) },
    { key: 'probe', label: 'Probe result', a: probeLabel(a), b: probeLabel(b), better: when(bothProbed ? preferTrue(a.probe!.passed, b.probe!.passed) : null) },
    { key: 'time', label: 'Time', a: `${(a.durationMs / 1000).toFixed(1)}s`, b: `${(b.durationMs / 1000).toFixed(1)}s`, better: when(lower(Math.round(a.durationMs / 100), Math.round(b.durationMs / 100))) },
    { key: 'model', label: 'Model', a: a.model ?? 'Unknown', b: b.model ?? 'Unknown', better: null },
  ];
}
