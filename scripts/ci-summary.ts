import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

type VitestResult = {
  duration?: number;
  startTime?: number;
  endTime?: number;
};

type VitestReport = {
  numPassedTests?: number;
  numFailedTests?: number;
  numPendingTests?: number;
  numTodoTests?: number;
  numTotalTests?: number;
  startTime?: number;
  duration?: number;
  stats?: { duration?: number };
  testResults?: VitestResult[];
};

type PlaywrightStats = {
  total?: number;
  expected?: number;
  unexpected?: number;
  flaky?: number;
  skipped?: number;
  duration?: number;
};

type PlaywrightTestResult = {
  retry?: number;
  status?: string;
};

type PlaywrightTest = {
  location?: { file?: string };
  results?: PlaywrightTestResult[];
};

type PlaywrightSuite = {
  title?: string;
  suites?: PlaywrightSuite[];
  tests?: PlaywrightTest[];
};

type PlaywrightReport = {
  stats?: PlaywrightStats;
  suites?: PlaywrightSuite[];
};

const ARTIFACT_ROOT = path.resolve(process.cwd(), '.artifacts');
const RUN_AND_VERIFY_PATH = path.resolve(process.cwd(), 'RUN_AND_VERIFY.md');
const SSOT_PATH = path.resolve(ARTIFACT_ROOT, 'SSOT.md');
const START_MARKER = '<!-- ssot-start -->';
const END_MARKER = '<!-- ssot-end -->';

function ensureArtifactsDir(): void {
  if (!fs.existsSync(ARTIFACT_ROOT)) {
    fs.mkdirSync(ARTIFACT_ROOT, { recursive: true });
  }
}

function readJson<T>(relativePath: string): T | null {
  const filePath = path.resolve(ARTIFACT_ROOT, relativePath);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[ci-summary] Failed to parse ${relativePath}:`, error);
    return null;
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function collectVitestDurations(report: VitestReport | null): number | null {
  if (!report) {
    return null;
  }

  const direct = report.stats?.duration ?? report.duration;
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return direct;
  }

  const perSuite = (report.testResults ?? [])
    .map((result) => {
      if (typeof result.duration === 'number') {
        return result.duration;
      }
      if (typeof result.startTime === 'number' && typeof result.endTime === 'number') {
        return result.endTime - result.startTime;
      }
      return null;
    })
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  if (perSuite.length > 0) {
    return sum(perSuite);
  }

  if (typeof report.startTime === 'number' && typeof (report as any).endTime === 'number') {
    const fallback = (report as any).endTime - report.startTime;
    if (Number.isFinite(fallback)) {
      return fallback;
    }
  }

  return null;
}

function collectPlaywrightDuration(report: PlaywrightReport | null): number | null {
  const duration = report?.stats?.duration;
  return typeof duration === 'number' && Number.isFinite(duration) ? duration : null;
}

function formatDuration(durationMs: number | null): string {
  if (!durationMs || !Number.isFinite(durationMs) || durationMs <= 0) {
    return 'unavailable';
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

function formatVitest(report: VitestReport | null): string {
  if (!report) {
    return 'unavailable';
  }

  const passed = report.numPassedTests ?? 0;
  const failed = report.numFailedTests ?? 0;
  const pending = (report.numPendingTests ?? 0) + (report.numTodoTests ?? 0);
  const total = report.numTotalTests ?? passed + failed + pending;
  return `${passed} passed / ${failed} failed / ${pending} pending (total ${total})`;
}

function formatPlaywright(stats: PlaywrightStats | undefined): string {
  if (!stats) {
    return 'unavailable';
  }

  const passed = stats.expected ?? 0;
  const failed = stats.unexpected ?? 0;
  const flaky = stats.flaky ?? 0;
  const skipped = stats.skipped ?? 0;
  const total = stats.total ?? passed + failed + skipped;
  return `${passed} passed / ${failed} failed / ${flaky} flaky / ${skipped} skipped (total ${total})`;
}

function collectFlakeCounts(report: PlaywrightReport | null): string {
  if (!report?.suites) {
    return 'none';
  }

  const counts = new Map<string, number>();

  const visit = (suite: PlaywrightSuite) => {
    suite.tests?.forEach((test) => {
      const results = test.results ?? [];
      const retryAttempts = results.reduce((total, result) => {
        const retries = result.retry ?? 0;
        return total + (retries > 0 ? 1 : 0);
      }, 0);
      if (retryAttempts <= 0) {
        return;
      }
      const filePath = test.location?.file ?? 'unknown';
      const key = path.relative(process.cwd(), filePath);
      counts.set(key, (counts.get(key) ?? 0) + retryAttempts);
    });

    suite.suites?.forEach(visit);
  };

  report.suites.forEach(visit);

  if (counts.size === 0) {
    return 'none';
  }

  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([file, retries]) => `${file} (${retries})`);

  return top.join(', ');
}

function getGitSha(): string {
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

function appendSummaryBlock(block: string): void {
  console.log(block);
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) {
    return;
  }

  try {
    fs.appendFileSync(summaryPath, `${block}\n`);
  } catch (error) {
    console.warn('[ci-summary] Unable to write to step summary:', error);
  }
}

function writeFileIfChanged(filePath: string, contents: string): void {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
  if (existing === contents) {
    return;
  }
  fs.writeFileSync(filePath, contents);
}

function updateRunAndVerify(block: string): void {
  if (!fs.existsSync(RUN_AND_VERIFY_PATH)) {
    return;
  }

  const placeholder = `${START_MARKER}\n${block}\n${END_MARKER}`;
  const current = fs.readFileSync(RUN_AND_VERIFY_PATH, 'utf-8');
  const pattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);
  const next = pattern.test(current)
    ? current.replace(pattern, placeholder)
    : `${placeholder}\n\n${current}`;

  if (next !== current) {
    fs.writeFileSync(RUN_AND_VERIFY_PATH, next);
  }
}

ensureArtifactsDir();

const sha = getGitSha();
const shortSha = sha === 'unknown' ? 'unknown' : sha.slice(0, 7);
const timestamp = new Date().toISOString();

const vitestReport = readJson<VitestReport>('vitest.json');
const vitestDuration = collectVitestDurations(vitestReport);

const playwrightReport = readJson<PlaywrightReport>('playwright.json');
const playwrightDuration = collectPlaywrightDuration(playwrightReport);

const lines = [
  '## CI SSOT',
  `sha: ${shortSha}${sha !== 'unknown' ? ` (${sha})` : ''}`,
  `date: ${timestamp}`,
  `vitest: ${formatVitest(vitestReport)}`,
  `vitest-duration: ${formatDuration(vitestDuration)}`,
  `playwright: ${formatPlaywright(playwrightReport?.stats)}`,
  `playwright-duration: ${formatDuration(playwrightDuration)}`,
  `flakiest-specs: ${collectFlakeCounts(playwrightReport)}`,
];

const block = lines.join('\n');
const blockWithNewline = `${block}\n`;

writeFileIfChanged(SSOT_PATH, blockWithNewline);
appendSummaryBlock(block);
updateRunAndVerify(block);
