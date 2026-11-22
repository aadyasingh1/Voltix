import * as childProcess from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Verify-before-apply: run a test command against the agent's PENDING changes without touching
 * the user's workspace. The workspace is copied into a throw-away sandbox directory, the pending
 * file contents are written there, the command runs inside the sandbox, and the sandbox is deleted.
 */

export interface SandboxFile {
  /** Path relative to the workspace root. */
  path: string;
  content: string;
}

export interface SandboxResult {
  command: string;
  passed: boolean;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
  /** One-line result, e.g. "60 passed in 0.31s". */
  summary: string;
  /** Tail of combined stdout/stderr. */
  output: string;
}

/** Heavy or generated directories: never copied. Environments are symlinked instead (see below). */
const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.venv', 'venv', 'env', '.env', '__pycache__', '.pytest_cache', '.mypy_cache',
  '.ruff_cache', '.tox', '.nox', 'dist', 'build', 'out', '.next', '.turbo', 'coverage', '.idea',
]);
/** Environment directories linked into the sandbox so tests can import installed dependencies. */
const LINK_DIRS = ['node_modules', '.venv', 'venv'];

const MAX_OUTPUT = 12000;

/**
 * Only test runners may be used for verification, and never with shell chaining or redirection.
 * The sandbox protects the workspace files; this list keeps the command itself boring.
 */
const VERIFY_COMMAND_PATTERNS = [
  /^(python3?|py)\s+-m\s+(pytest|unittest)\b/,
  /^pytest\b/,
  /^npm\s+(test|run\s+test)\b/,
  /^(npx\s+)?(jest|vitest)\b/,
  /^go\s+test\b/,
  /^cargo\s+test\b/,
];

const SHELL_METACHARACTERS = /[;&|`$<>\n\r]/;

export function validateVerifyCommand(command: string): string | undefined {
  const trimmed = command.trim();
  if (!trimmed) return 'Empty verification command.';
  if (SHELL_METACHARACTERS.test(trimmed)) return 'Verification commands cannot chain, pipe, redirect or substitute.';
  if (!VERIFY_COMMAND_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return 'Only test runners are allowed for verification (python -m pytest, pytest, npm test, jest, vitest, go test, cargo test).';
  }
  return undefined;
}

const PROBE_COMMAND_PATTERNS = [
  /^(python3?|flask|node|pytest)(\s|$)/,
  /^npm\s+(test(\s|$)|run\s+\S+)/,
];
const PROBE_OUTPUT_LIMIT = 3000;

/** The behaviour probe is user-supplied, so it gets the same no-chaining rule plus its own allowlist. */
export function validateProbeCommand(command: string): string | undefined {
  const trimmed = command.trim();
  if (!trimmed) return 'Empty probe command.';
  if (SHELL_METACHARACTERS.test(trimmed)) return 'Probe commands cannot chain, pipe, redirect or substitute.';
  if (!PROBE_COMMAND_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return 'Probe commands must start with python, python3, flask, node, pytest, npm test or npm run.';
  }
  return undefined;
}

/** Stable fingerprint of a set of pending files, used to know whether a result is still current. */
export function fingerprintFiles(files: SandboxFile[]): string {
  const hash = crypto.createHash('sha256');
  [...files].sort((a, b) => a.path.localeCompare(b.path)).forEach(file => {
    hash.update(file.path).update('\0').update(file.content).update('\0');
  });
  return hash.digest('hex');
}

/** Pick a sensible test command for the pending files when neither the agent nor the user gave one. */
export function inferVerifyCommand(root: string, files: SandboxFile[]): string | undefined {
  const exists = (name: string) => fs.existsSync(path.join(root, name));
  const pythonTests = files
    .map(file => file.path.split(path.sep).join('/'))
    .filter(p => /(^|\/)(test_[^/]+|[^/]+_test)\.py$/.test(p));
  const isPython = ['pyproject.toml', 'setup.cfg', 'setup.py', 'pytest.ini', 'tox.ini'].some(exists);
  if (pythonTests.length) return `python -m pytest -q ${pythonTests.join(' ')}`;
  if (isPython && (exists('tests') || exists('test'))) return 'python -m pytest -q -x';
  if (exists('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
      if (pkg?.scripts?.test && !/no test specified/.test(pkg.scripts.test)) return 'npm test --silent';
    } catch { /* unreadable package.json: no inference */ }
  }
  return undefined;
}

/** Extract a short human summary, preferring the test runner's own final line. */
export function summariseOutput(output: string, exitCode: number, timedOut: boolean): string {
  if (timedOut) return 'Timed out';
  const lines = output.split(/\r?\n/).map(line => line.replace(/=+/g, '').trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index];
    if (/\b\d+\s+(passed|failed|errors?)\b/i.test(line) || /^Tests?:/i.test(line) || /^(OK|FAILED)\b/.test(line)) {
      return line.slice(0, 160);
    }
  }
  return exitCode === 0 ? 'Passed (exit code 0)' : `Failed (exit code ${exitCode})`;
}

function buildEnv(root: string, sandbox: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, CI: '1', FORCE_COLOR: '0', NO_COLOR: '1', PYTHONDONTWRITEBYTECODE: '1' };
  const binName = process.platform === 'win32' ? 'Scripts' : 'bin';
  const venvBins = ['.venv', 'venv']
    .map(dir => path.join(root, dir, binName))
    .filter(dir => fs.existsSync(dir));
  const pathKey = Object.keys(env).find(key => key.toUpperCase() === 'PATH') ?? 'PATH';
  env[pathKey] = [...venvBins, env[pathKey] ?? ''].filter(Boolean).join(path.delimiter);
  if (venvBins.length) env.VIRTUAL_ENV = path.dirname(venvBins[0]);
  // Editable installs point at the ORIGINAL sources; put the sandbox copy first so the pending code is what gets imported.
  const pythonPaths = [path.join(sandbox, 'src'), sandbox].filter(dir => fs.existsSync(dir));
  env.PYTHONPATH = [...pythonPaths, env.PYTHONPATH ?? ''].filter(Boolean).join(path.delimiter);
  return env;
}

function createSandbox(root: string, files: SandboxFile[]): string {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'voltix-sandbox-'));
  fs.cpSync(root, sandbox, {
    recursive: true,
    dereference: false,
    filter: source => !SKIP_DIRS.has(path.basename(source)) || source === root,
  });
  for (const dir of LINK_DIRS) {
    const target = path.join(root, dir);
    if (fs.existsSync(target)) {
      try { fs.symlinkSync(target, path.join(sandbox, dir), process.platform === 'win32' ? 'junction' : 'dir'); } catch { /* best effort */ }
    }
  }
  for (const file of files) {
    const destination = path.resolve(sandbox, file.path);
    if (destination !== sandbox && !destination.startsWith(sandbox + path.sep)) continue;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, file.content, 'utf8');
  }
  return sandbox;
}

export async function runInSandbox(
  root: string,
  files: SandboxFile[],
  command: string,
  timeoutMs = 180_000
): Promise<SandboxResult> {
  const invalid = validateVerifyCommand(command);
  if (invalid) throw new Error(invalid);
  return execInSandbox(root, files, command, timeoutMs);
}

/** Runs a validated behaviour probe against a future's pending files. */
export async function runProbeInSandbox(
  root: string,
  files: SandboxFile[],
  command: string,
  timeoutMs = 60_000
): Promise<{ command: string; exitCode: number; passed: boolean; timedOut: boolean; output: string }> {
  const invalid = validateProbeCommand(command);
  if (invalid) throw new Error(invalid);
  const result = await execInSandbox(root, files, command.trim(), timeoutMs);
  return {
    command: result.command,
    exitCode: result.exitCode,
    passed: result.passed,
    timedOut: result.timedOut,
    output: result.output.slice(-PROBE_OUTPUT_LIMIT),
  };
}

async function execInSandbox(
  root: string,
  files: SandboxFile[],
  command: string,
  timeoutMs: number
): Promise<SandboxResult> {
  const started = Date.now();
  const sandbox = createSandbox(root, files);
  try {
    return await new Promise<SandboxResult>(resolve => {
      const child = childProcess.spawn(command, { cwd: sandbox, shell: true, env: buildEnv(root, sandbox) });
      let output = '';
      let timedOut = false;
      const append = (chunk: Buffer) => {
        output += chunk.toString();
        if (output.length > MAX_OUTPUT * 4) output = output.slice(-MAX_OUTPUT * 2);
      };
      child.stdout?.on('data', append);
      child.stderr?.on('data', append);
      const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
      const finish = (exitCode: number) => {
        clearTimeout(timer);
        const tail = output.length > MAX_OUTPUT ? '[earlier output truncated]\n' + output.slice(-MAX_OUTPUT) : output;
        const cleaned = tail.split(sandbox).join('.');
        resolve({
          command,
          passed: exitCode === 0 && !timedOut,
          exitCode,
          timedOut,
          durationMs: Date.now() - started,
          summary: summariseOutput(cleaned, exitCode, timedOut),
          output: cleaned,
        });
      };
      child.on('error', error => { append(Buffer.from(String(error))); finish(-1); });
      child.on('close', code => finish(code ?? -1));
    });
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
}
