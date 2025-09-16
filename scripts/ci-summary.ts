import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

interface VitestAssertion {
  duration?: number;
}

interface VitestSuiteResult {
  assertionResults?: VitestAssertion[];
}

interface VitestReport {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  testResults: VitestSuiteResult[];
}

interface PlaywrightResultError {
  message?: string;
  value?: string;
}

interface PlaywrightTestResult {
  status?: string;
  duration?: number;
  retry?: number;
  error?: PlaywrightResultError;
  errors?: PlaywrightResultError[];
}

interface PlaywrightTest {
  results?: PlaywrightTestResult[];
}

interface PlaywrightSpec {
  title: string;
  file?: string;
  tests?: PlaywrightTest[];
}

interface PlaywrightSuite {
  file?: string;
  specs?: PlaywrightSpec[];
}

interface PlaywrightProjectConfig {
  name: string;
  testDir?: string;
}

interface PlaywrightReport {
  config: {
    projects?: PlaywrightProjectConfig[];
  };
  suites?: PlaywrightSuite[];
  stats: {
    duration?: number;
    expected?: number;
    unexpected?: number;
    skipped?: number;
    flaky?: number;
  };
}

interface SuiteSummary {
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs: number;
}

interface FlakySpecSummary {
  path: string;
  title: string;
  failures: number;
  flaky: number;
  retries: number;
  durationMs: number;
  message?: string;
}

interface SummaryData {
  suites: SuiteSummary[];
  flakiest: FlakySpecSummary[];
  git: { sha: string; date?: string };
  generatedAt: Date;
  allGreen: boolean;
  lastGreenLine: string;
  currentCommitLine?: string;
  totalsTable: {
    header: string;
    divider: string;
    rows: string[];
  };
}

const ARTIFACTS_DIR = path.resolve(process.cwd(), '.artifacts');
const VITEST_PATH = path.join(ARTIFACTS_DIR, 'vitest.json');
const PLAYWRIGHT_PATH = path.join(ARTIFACTS_DIR, 'playwright.json');
const OUTPUT_PATH = path.join(ARTIFACTS_DIR, 'SSOT.md');
const RUN_AND_VERIFY_PATH = path.resolve(process.cwd(), 'RUN_AND_VERIFY.md');

async function loadJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, 'utf8');
  const braceIndex = raw.indexOf('{');
  if (braceIndex === -1) {
    throw new Error(`Unable to locate JSON payload in ${filePath}`);
  }
  const payload = raw.slice(braceIndex);
  return JSON.parse(payload) as T;
}

function formatDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return '0s';
  }
  const totalSeconds = milliseconds / 1000;
  if (totalSeconds < 1) {
    return `${totalSeconds.toFixed(2)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  if (minutes === 0) {
    return `${seconds.toFixed(seconds >= 10 ? 1 : 2)}s`;
  }
  const secondsText = seconds > 0 ? `${seconds.toFixed(seconds >= 10 ? 1 : 2)}s` : '0s';
  return `${minutes}m ${secondsText}`;
}

function formatUtcDate(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  const hours = `${date.getUTCHours()}`.padStart(2, '0');
  const minutes = `${date.getUTCMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function cleanErrorMessage(message?: string): string | undefined {
  if (!message) {
    return undefined;
  }

  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const dependencyLine = lines.find((line) => /missing dependencies/i.test(line));
  if (dependencyLine) {
    const normalized = dependencyLine.replace(/[╔║╚═]/g, '').trim().replace(/\s+/g, ' ');
    return normalized.length > 160 ? `${normalized.slice(0, 157)}…` : normalized;
  }

  const filtered = lines.filter((line) => !/^[╔║╚═]+/.test(line));
  const preferredLine =
    filtered.find((line) => !line.toLowerCase().startsWith('error:')) ??
    filtered[0] ??
    lines[0];

  if (!preferredLine) {
    return undefined;
  }

  const sanitized = preferredLine.replace(/[╔║╚═]/g, '').trim().replace(/\s+/g, ' ');
  return sanitized.length > 160 ? `${sanitized.slice(0, 157)}…` : sanitized;
}

function summarizeVitest(report: VitestReport): SuiteSummary {
  const durationMs = report.testResults?.reduce((suiteTotal, suite) => {
    const assertions = suite.assertionResults ?? [];
    const assertionDuration = assertions.reduce((acc, assertion) => acc + (assertion.duration ?? 0), 0);
    return suiteTotal + assertionDuration;
  }, 0) ?? 0;

  const skipped = report.numPendingTests + report.numTodoTests;

  return {
    name: 'Vitest',
    passed: report.numPassedTests ?? 0,
    failed: report.numFailedTests ?? 0,
    skipped,
    flaky: 0,
    durationMs,
  };
}

function resolveProjectTestDir(report: PlaywrightReport): string | undefined {
  const project = report.config?.projects?.[0];
  return project?.testDir;
}

function summarizePlaywright(report: PlaywrightReport): SuiteSummary {
  const stats = report.stats ?? {};
  const passed = stats.expected ?? 0;
  const failed = stats.unexpected ?? 0;
  const skipped = stats.skipped ?? 0;
  const flaky = stats.flaky ?? 0;
  const durationMs = stats.duration ?? 0;

  const projectName = report.config?.projects?.[0]?.name ?? 'playwright';

  return {
    name: `Playwright (${projectName})`,
    passed,
    failed,
    skipped,
    flaky,
    durationMs,
  };
}

function collectFlakySpecs(report: PlaywrightReport): FlakySpecSummary[] {
  const specs: FlakySpecSummary[] = [];
  const suites = report.suites ?? [];
  const testDir = resolveProjectTestDir(report);

  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      let failures = 0;
      let flaky = 0;
      let retries = 0;
      let durationMs = 0;
      let message: string | undefined;

      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          const status = result.status ?? 'passed';
          durationMs += result.duration ?? 0;
          retries += result.retry ?? 0;
          if (status !== 'passed' && status !== 'skipped') {
            failures += 1;
            if (!message) {
              const primaryError = result.error?.message ?? result.errors?.[0]?.message ?? result.error?.value ?? result.errors?.[0]?.value;
              message = cleanErrorMessage(primaryError);
            }
          }
          if (status === 'flaky') {
            flaky += 1;
          }
        }
      }

      if (failures > 0 || flaky > 0) {
        const candidatePath = spec.file ?? suite.file ?? '';
        const absoluteCandidate = testDir ? path.join(testDir, candidatePath) : candidatePath;
        const relativePath = normalizePath(path.relative(process.cwd(), absoluteCandidate));
        specs.push({
          path: relativePath,
          title: spec.title,
          failures,
          flaky,
          retries,
          durationMs,
          message,
        });
      }
    }
  }

  specs.sort((a, b) => {
    if (b.flaky !== a.flaky) {
      return b.flaky - a.flaky;
    }
    if (b.failures !== a.failures) {
      return b.failures - a.failures;
    }
    if (b.retries !== a.retries) {
      return b.retries - a.retries;
    }
    if (b.durationMs !== a.durationMs) {
      return b.durationMs - a.durationMs;
    }
    return a.title.localeCompare(b.title);
  });

  return specs;
}

function getGitMetadata(): { sha: string; date?: string } {
  try {
    const sha = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    let date: string | undefined;
    try {
      date = execSync('git show -s --format=%cI HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch (error) {
      date = undefined;
    }
    return { sha, date };
  } catch (error) {
    return { sha: 'unknown', date: undefined };
  }
}

function createSummaryData(options: {
  vitest: SuiteSummary;
  playwright: SuiteSummary;
  flakiest: FlakySpecSummary[];
  git: { sha: string; date?: string };
  generatedAt: Date;
}): SummaryData {
  const { vitest, playwright, flakiest, git, generatedAt } = options;
  const suites = [vitest, playwright];
  const allGreen = suites.every((suite) => suite.failed === 0 && suite.flaky === 0);
  const gitDate = git.date ? formatUtcDate(git.date) : 'date unavailable';

  let lastGreenLine = `**Last green commit:** \`${shortSha(git.sha)}\` (${gitDate})`;
  let currentCommitLine: string | undefined;

  if (!allGreen) {
    const failingSuites = suites.filter((suite) => suite.failed > 0 || suite.flaky > 0);
    const failureSummary = failingSuites
      .map((suite) => `${suite.name}: ${suite.failed} failed${suite.flaky ? `, ${suite.flaky} flaky` : ''}`)
      .join('; ');
    lastGreenLine = `**Last green commit:** _pending — current run has failures (${failureSummary})._`;
    currentCommitLine = `**Current commit:** \`${shortSha(git.sha)}\` (${gitDate})`;
  }

  const totalsRows = suites.map(
    (suite) =>
      `| ${suite.name} | ${suite.passed} | ${suite.failed} | ${suite.skipped} | ${suite.flaky} | ${formatDuration(suite.durationMs)} |`,
  );

  return {
    suites,
    flakiest,
    git,
    generatedAt,
    allGreen,
    lastGreenLine,
    currentCommitLine,
    totalsTable: {
      header: '| Suite | Passed | Failed | Skipped | Flaky | Duration |',
      divider: '| --- | ---: | ---: | ---: | ---: | ---: |',
      rows: totalsRows,
    },
  };
}

function renderFlakiestLines(flakiest: FlakySpecSummary[]): string[] {
  if (flakiest.length === 0) {
    return ['_No flaky specs detected in the latest artifacts._'];
  }

  const top = flakiest.slice(0, 5);
  return top.map((spec, index) => {
    const parts = [`${index + 1}. \`${spec.path}\``];
    if (spec.title) {
      parts.push(`— ${spec.title}`);
    }
    const outcome: string[] = [];
    if (spec.failures > 0) {
      outcome.push(`failed ×${spec.failures}`);
    }
    if (spec.flaky > 0) {
      outcome.push(`flaky ×${spec.flaky}`);
    }
    if (spec.retries > 0) {
      outcome.push(`retries ×${spec.retries}`);
    }
    parts.push(`(${outcome.join(', ') || 'no runs'})`);
    parts.push(`— ${formatDuration(spec.durationMs)}`);
    if (spec.message) {
      parts.push(`— ${spec.message}`);
    }
    return parts.join(' ');
  });
}

function renderSummaryMarkdown(summary: SummaryData): string {
  const lines: string[] = [];
  lines.push('# CI Single Source of Truth');
  lines.push('');
  lines.push(summary.lastGreenLine);
  if (summary.currentCommitLine) {
    lines.push(summary.currentCommitLine);
  }
  lines.push('');
  lines.push(`Generated: ${formatUtcDate(summary.generatedAt)}`);
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push(summary.totalsTable.header);
  lines.push(summary.totalsTable.divider);
  lines.push(...summary.totalsTable.rows);
  lines.push('');
  lines.push('## Flakiest specs');
  lines.push('');
  lines.push(...renderFlakiestLines(summary.flakiest));
  lines.push('');
  lines.push('_Source: `.artifacts/vitest.json`, `.artifacts/playwright.json`._');
  lines.push('');
  return lines.join('\n');
}

function renderRunAndVerifyBlock(summary: SummaryData): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(summary.lastGreenLine);
  if (summary.currentCommitLine) {
    lines.push(summary.currentCommitLine);
  }
  lines.push(
    `Generated: ${formatUtcDate(summary.generatedAt)} — see [.artifacts/SSOT.md](.artifacts/SSOT.md) for full artifact details.`,
  );
  lines.push('');
  lines.push(summary.totalsTable.header);
  lines.push(summary.totalsTable.divider);
  lines.push(...summary.totalsTable.rows);
  lines.push('');
  lines.push('**Flakiest specs**');
  lines.push('');
  lines.push(...renderFlakiestLines(summary.flakiest));
  lines.push('');
  lines.push('Quick commands to run the Instant Practice feature and verify everything works.');
  lines.push('');
  return lines.join('\n');
}

async function updateRunAndVerifyDocument(summary: SummaryData): Promise<void> {
  const block = renderRunAndVerifyBlock(summary);
  const document = await readFile(RUN_AND_VERIFY_PATH, 'utf8');
  const heading = '## CI Single Source of Truth (SSOT)';
  const headingIndex = document.indexOf(heading);

  if (headingIndex === -1) {
    throw new Error('Unable to locate CI summary heading in RUN_AND_VERIFY.md');
  }

  const headingLineEnd = document.indexOf('\n', headingIndex + heading.length);
  const blockStart = headingLineEnd === -1 ? document.length : headingLineEnd + 1;
  const rest = document.slice(blockStart);
  const nextHeadingMatch = /\n## /.exec(rest);
  const blockEnd = nextHeadingMatch ? blockStart + nextHeadingMatch.index : document.length;
  const prefix = document.slice(0, blockStart);
  const suffix = document.slice(blockEnd).replace(/^\n+/, '');
  const normalizedBlock = block.trimEnd();
  let nextDocument = `${prefix}${normalizedBlock}\n\n${suffix}`;
  if (!nextDocument.endsWith('\n')) {
    nextDocument += '\n';
  }
  await writeFile(RUN_AND_VERIFY_PATH, nextDocument, 'utf8');
}

async function main(): Promise<void> {
  const [vitestReport, playwrightReport] = await Promise.all([
    loadJson<VitestReport>(VITEST_PATH),
    loadJson<PlaywrightReport>(PLAYWRIGHT_PATH),
  ]);

  const vitestSummary = summarizeVitest(vitestReport);
  const playwrightSummary = summarizePlaywright(playwrightReport);
  const flakiest = collectFlakySpecs(playwrightReport);
  const git = getGitMetadata();

  const summary = createSummaryData({
    vitest: vitestSummary,
    playwright: playwrightSummary,
    flakiest,
    git,
    generatedAt: new Date(),
  });

  const markdown = renderSummaryMarkdown(summary);
  await writeFile(OUTPUT_PATH, `${markdown}\n`, 'utf8');
  await updateRunAndVerifyDocument(summary);
}

main().catch((error) => {
  console.error('[ci-summary] Failed to generate SSOT markdown:', error);
  process.exitCode = 1;
});
