import { access, readFile, writeFile } from 'fs/promises';
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

const ARTIFACTS_DIR = path.resolve(process.cwd(), '.artifacts');
const VITEST_PATH = path.join(ARTIFACTS_DIR, 'vitest.json');
const PLAYWRIGHT_PATH = path.join(ARTIFACTS_DIR, 'playwright.json');
const FLAKY_PATH = path.join(ARTIFACTS_DIR, 'playwright', 'flaky.json');
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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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

function renderSummaryMarkdown(options: {
  vitest: SuiteSummary;
  playwright: SuiteSummary;
  topFlaky: FlakySpecSummary[];
  git: { sha: string; date?: string };
  sources: string[];
  generatedAt: Date;
}): string {
  const { vitest, playwright, topFlaky, git, sources, generatedAt } = options;
  const suites = [vitest, playwright];
  const allGreen = suites.every((suite) => suite.failed === 0 && suite.flaky === 0);

  const lines: string[] = [];
  lines.push('# CI Single Source of Truth');
  lines.push('');

  if (allGreen) {
    const gitDate = git.date ? formatUtcDate(git.date) : 'date unavailable';
    lines.push(`**Last green commit:** \`${shortSha(git.sha)}\` (${gitDate})`);
  } else {
    const gitDate = git.date ? formatUtcDate(git.date) : 'date unavailable';
    const failingSuites = suites.filter((suite) => suite.failed > 0 || suite.flaky > 0);
    const failureSummary = failingSuites
      .map((suite) => `${suite.name}: ${suite.failed} failed${suite.flaky ? `, ${suite.flaky} flaky` : ''}`)
      .join('; ');
    lines.push(`**Last green commit:** _pending — current run has failures (${failureSummary})._`);
    lines.push(`**Current commit:** \`${shortSha(git.sha)}\` (${gitDate})`);
  }

  lines.push('');
  lines.push(`Generated: ${formatUtcDate(generatedAt)}`);
  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push('| Suite | Passed | Failed | Skipped | Flaky | Duration |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');

  for (const suite of suites) {
    lines.push(
      `| ${suite.name} | ${suite.passed} | ${suite.failed} | ${suite.skipped} | ${suite.flaky} | ${formatDuration(suite.durationMs)} |`,
    );
  }

  lines.push('');
  lines.push('## Top flakiest');
  lines.push('');

  if (topFlaky.length === 0) {
    lines.push('_No flaky specs detected in the latest artifacts._');
  } else {
    const top = topFlaky.slice(0, 5);
    top.forEach((spec, index) => {
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
      lines.push(parts.join(' '));
    });
  }

  lines.push('');
  const sourceText = sources.length > 0 ? sources.map((source) => `\`${source}\``).join(', ') : '';
  if (sourceText) {
    lines.push(`_Source: ${sourceText}._`);
    lines.push('');
  }
  lines.push('');

  return lines.join('\n');
}

function renderRunAndVerifySection(options: {
  vitest: SuiteSummary;
  playwright: SuiteSummary;
  topFlaky: FlakySpecSummary[];
  git: { sha: string; date?: string };
  generatedAt: Date;
  sources: string[];
}): string {
  const { vitest, playwright, topFlaky, git, generatedAt, sources } = options;
  const suites = [vitest, playwright];
  const allGreen = suites.every((suite) => suite.failed === 0 && suite.flaky === 0);
  const lines: string[] = [];

  if (allGreen) {
    const gitDate = git.date ? formatUtcDate(git.date) : 'date unavailable';
    lines.push(`**Last green commit:** \`${shortSha(git.sha)}\` (${gitDate})`);
  } else {
    const gitDate = git.date ? formatUtcDate(git.date) : 'date unavailable';
    const failingSuites = suites.filter((suite) => suite.failed > 0 || suite.flaky > 0);
    const failureSummary = failingSuites
      .map((suite) => `${suite.name}: ${suite.failed} failed${suite.flaky ? `, ${suite.flaky} flaky` : ''}`)
      .join('; ');
    lines.push(`**Last green commit:** _pending — current run has failures (${failureSummary})._`);
    lines.push(`**Current commit:** \`${shortSha(git.sha)}\` (${gitDate})`);
  }

  lines.push(`Generated: ${formatUtcDate(generatedAt)}`);
  lines.push('');
  lines.push('| Suite | Passed | Failed | Skipped | Flaky | Duration |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: |');

  for (const suite of suites) {
    lines.push(
      `| ${suite.name} | ${suite.passed} | ${suite.failed} | ${suite.skipped} | ${suite.flaky} | ${formatDuration(suite.durationMs)} |`,
    );
  }

  lines.push('');
  lines.push('**Top flakiest**');
  lines.push('');

  if (topFlaky.length === 0) {
    lines.push('_No flaky specs detected in the latest artifacts._');
  } else {
    const top = topFlaky.slice(0, 5);
    top.forEach((spec, index) => {
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
      lines.push(parts.join(' '));
    });
  }

  if (sources.length > 0) {
    lines.push('');
    lines.push(`_Source: ${sources.map((source) => `\`${source}\``).join(', ')}._`);
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  const [vitestReport, playwrightReport] = await Promise.all([
    loadJson<VitestReport>(VITEST_PATH),
    loadJson<PlaywrightReport>(PLAYWRIGHT_PATH),
  ]);

  const flakyReport = (await fileExists(FLAKY_PATH))
    ? await loadJson<PlaywrightReport>(FLAKY_PATH)
    : null;

  const vitestSummary = summarizeVitest(vitestReport);
  const playwrightSummary = summarizePlaywright(playwrightReport);
  const topFlaky = flakyReport ? collectFlakySpecs(flakyReport) : collectFlakySpecs(playwrightReport);
  const git = getGitMetadata();
  const generatedAt = new Date();
  const sources = ['.artifacts/vitest.json', '.artifacts/playwright.json'];
  if (flakyReport) {
    sources.push('.artifacts/playwright/flaky.json');
  }

  const markdown = renderSummaryMarkdown({
    vitest: vitestSummary,
    playwright: playwrightSummary,
    topFlaky,
    git,
    sources,
    generatedAt,
  });

  await writeFile(OUTPUT_PATH, `${markdown}\n`, 'utf8');

  try {
    const existing = await readFile(RUN_AND_VERIFY_PATH, 'utf8');
    const marker = '## CI Single Source of Truth (SSOT)';
    const markerIndex = existing.indexOf(marker);

    if (markerIndex !== -1) {
      const sectionStart = markerIndex + marker.length;
      const nextHeadingIndex = existing.indexOf('\n## ', sectionStart);
      const sectionEnd = nextHeadingIndex === -1 ? existing.length : nextHeadingIndex;
      const before = existing.slice(0, sectionStart);
      const after = existing.slice(sectionEnd);
      const section = renderRunAndVerifySection({
        vitest: vitestSummary,
        playwright: playwrightSummary,
        topFlaky,
        git,
        generatedAt,
        sources,
      });
      const normalizedAfter = after.startsWith('\n') ? after : `\n${after}`;
      const updated = `${before}\n\n${section.trimEnd()}${normalizedAfter}`;
      await writeFile(RUN_AND_VERIFY_PATH, updated, 'utf8');
    } else {
      console.warn('[ci-summary] Unable to locate CI SSOT section in RUN_AND_VERIFY.md');
    }
  } catch (error) {
    console.warn('[ci-summary] Failed to update RUN_AND_VERIFY.md:', error);
  }
}

main().catch((error) => {
  console.error('[ci-summary] Failed to generate SSOT markdown:', error);
  process.exitCode = 1;
});
