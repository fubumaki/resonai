import fs from 'node:fs';
import path from 'node:path';

interface BudgetSet {
  typescript?: { errors?: number };
  eslint?: { errors?: number; warnings?: number };
  a11y?: { violations?: number };
  unit?: { failures?: number };
  e2e?: { failures?: number };
  bundle?: { app_js_kb?: number; vendor_kb?: number };
  perf?: { ttci_ms?: number };
}

interface ESLintRuleCount {
  rule: string;
  count: number;
}

interface ESLintSummary {
  errors: number | null;
  warnings: number | null;
  topRules: ESLintRuleCount[];
}

interface TSSummary {
  errors: number | null;
  samples: string[];
}

interface UnitSummary {
  failures: number | null;
}

interface E2ESummary {
  failures: number | null;
}

interface A11ySummary {
  violations: number | null;
}

interface BundleSummary {
  app_js_kb: number | null;
  vendor_kb: number | null;
}

interface PerfSummary {
  ttci_ms: number | null;
}

interface Signals {
  generatedAt: string;
  eslint: ESLintSummary;
  typescript: TSSummary;
  unit: UnitSummary;
  e2e: E2ESummary;
  a11y: A11ySummary;
  bundle: BundleSummary;
  perf: PerfSummary;
}

interface MetricConfig {
  label: string;
  actual: number | null;
  budget: number | null;
  formatter?: (value: number) => string;
}

const rootDir = process.cwd();
const reportsDir = path.join(rootDir, 'reports');
const budgetsPath = path.join(rootDir, 'QUALITY-GATES', 'budgets.json');

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const formatCount = (value: number): string => numberFormatter.format(value);
const formatKilobytes = (value: number): string => `${numberFormatter.format(value)} KB`;
const formatMilliseconds = (value: number): string => `${numberFormatter.format(value)} ms`;

main();

function main(): void {
  const budgets = loadBudgets(budgetsPath);
  const signals = collectSignals(reportsDir);

  const metrics: MetricConfig[] = [
    {
      label: 'TypeScript Errors',
      actual: signals.typescript.errors,
      budget: getNumber(budgets.typescript?.errors),
      formatter: formatCount,
    },
    {
      label: 'ESLint Errors',
      actual: signals.eslint.errors,
      budget: getNumber(budgets.eslint?.errors),
      formatter: formatCount,
    },
    {
      label: 'ESLint Warnings',
      actual: signals.eslint.warnings,
      budget: getNumber(budgets.eslint?.warnings),
      formatter: formatCount,
    },
    {
      label: 'Unit Test Failures',
      actual: signals.unit.failures,
      budget: getNumber(budgets.unit?.failures),
      formatter: formatCount,
    },
    {
      label: 'E2E Test Failures',
      actual: signals.e2e.failures,
      budget: getNumber(budgets.e2e?.failures),
      formatter: formatCount,
    },
    {
      label: 'Accessibility Violations',
      actual: signals.a11y.violations,
      budget: getNumber(budgets.a11y?.violations),
      formatter: formatCount,
    },
    {
      label: 'Bundle (app JS)',
      actual: signals.bundle.app_js_kb,
      budget: getNumber(budgets.bundle?.app_js_kb),
      formatter: formatKilobytes,
    },
    {
      label: 'Bundle (vendor JS)',
      actual: signals.bundle.vendor_kb,
      budget: getNumber(budgets.bundle?.vendor_kb),
      formatter: formatKilobytes,
    },
    {
      label: 'Perf (TTCI)',
      actual: signals.perf.ttci_ms,
      budget: getNumber(budgets.perf?.ttci_ms),
      formatter: formatMilliseconds,
    },
  ];

  const lines = renderMarkdownBlock(signals.generatedAt, metrics, signals);
  process.stdout.write(lines.join('\n'));
}

function renderMarkdownBlock(
  generatedAt: string,
  metrics: MetricConfig[],
  signals: Signals,
): string[] {
  const lines: string[] = [];
  lines.push('```markdown');
  lines.push(`> Generated: ${generatedAt}`);
  lines.push('');
  lines.push('| Metric | Actual | Budget | Status |');
  lines.push('| --- | --- | --- | --- |');

  for (const metric of metrics) {
    lines.push(
      `| ${metric.label} | ${formatActual(metric)} | ${formatBudget(metric)} | ${formatStatus(metric)} |`,
    );
  }

  if (signals.eslint.topRules.length > 0) {
    lines.push('');
    lines.push('Top ESLint rules by frequency:');
    for (const { rule, count } of signals.eslint.topRules) {
      lines.push(`- ${rule} ×${count}`);
    }
  }

  if (signals.typescript.errors && signals.typescript.errors > 0 && signals.typescript.samples.length) {
    lines.push('');
    lines.push('TypeScript error samples:');
    for (const sample of signals.typescript.samples) {
      lines.push(`- ${sample}`);
    }
  }

  lines.push('```');
  lines.push('');
  return lines;
}

function formatActual(metric: MetricConfig): string {
  if (metric.actual === null) return '—';
  const formatter = metric.formatter ?? formatCount;
  return formatter(metric.actual);
}

function formatBudget(metric: MetricConfig): string {
  if (metric.budget === null) return '—';
  const formatter = metric.formatter ?? formatCount;
  return `≤ ${formatter(metric.budget)}`;
}

function formatStatus(metric: MetricConfig): string {
  const { actual, budget } = metric;
  if (actual === null || budget === null) return '—';
  if (actual <= budget) return '✅ within budget';
  const delta = actual - budget;
  const formatter = metric.formatter ?? formatCount;
  const formattedDelta = formatter(Math.abs(delta));
  return `❌ over by ${formattedDelta}`;
}

function loadBudgets(filePath: string): BudgetSet {
  const raw = readJson(filePath);
  if (!isRecord(raw)) return {};

  const budgets: BudgetSet = {};
  budgets.typescript = extractBudgetSection(raw, 'typescript', ['errors']);
  budgets.eslint = extractBudgetSection(raw, 'eslint', ['errors', 'warnings']);
  budgets.a11y = extractBudgetSection(raw, 'a11y', ['violations']);
  budgets.unit = extractBudgetSection(raw, 'unit', ['failures']);
  budgets.e2e = extractBudgetSection(raw, 'e2e', ['failures']);
  budgets.bundle = extractBudgetSection(raw, 'bundle', ['app_js_kb', 'vendor_kb']);
  budgets.perf = extractBudgetSection(raw, 'perf', ['ttci_ms']);
  return budgets;
}

function extractBudgetSection(
  root: Record<string, unknown>,
  key: string,
  fields: readonly string[],
): Record<string, number> | undefined {
  const section = root[key];
  if (!isRecord(section)) return undefined;

  const out: Record<string, number> = {};
  for (const field of fields) {
    const value = getNumber(section[field]);
    if (value !== null) {
      out[field] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function collectSignals(dir: string): Signals {
  const eslint = summarizeESLint(dir);
  const typescript = summarizeTypeScript(dir);
  const unit = summarizeUnit(dir);
  const e2e = summarizeE2E(dir);
  const a11y = summarizeA11y(dir);
  const bundle = summarizeBundle(dir);
  const perf = summarizePerf(dir);
  const generatedAt = new Date().toISOString();

  return { generatedAt, eslint, typescript, unit, e2e, a11y, bundle, perf };
}

function summarizeESLint(dir: string): ESLintSummary {
  const file = path.join(dir, 'eslint.json');
  const raw = readJson(file);
  if (raw === null) {
    return { errors: null, warnings: null, topRules: [] };
  }

  const results: unknown[] = [];
  if (Array.isArray(raw)) {
    results.push(...raw);
  } else if (isRecord(raw) && Array.isArray(raw.results)) {
    results.push(...raw.results);
  }

  let errors = 0;
  let warnings = 0;
  const counts = new Map<string, number>();

  for (const entry of results) {
    if (!isRecord(entry)) continue;
    errors += getNumber(entry.errorCount) ?? 0;
    warnings += getNumber(entry.warningCount) ?? 0;

    const messages = Array.isArray(entry.messages) ? entry.messages : [];
    for (const message of messages) {
      if (!isRecord(message)) continue;
      const rule = typeof message.ruleId === 'string'
        ? message.ruleId
        : typeof message.message === 'string'
          ? message.message
          : 'unknown';
      counts.set(rule, (counts.get(rule) ?? 0) + 1);
    }
  }

  const topRules: ESLintRuleCount[] = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rule, count]) => ({ rule, count }));

  return {
    errors: results.length === 0 ? null : errors,
    warnings: results.length === 0 ? null : warnings,
    topRules,
  };
}

function summarizeTypeScript(dir: string): TSSummary {
  const file = path.join(dir, 'tsc.txt');
  const text = readText(file);
  if (text === null) {
    return { errors: null, samples: [] };
  }

  const samples: string[] = [];
  let count = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/\berror TS\d+/i.test(line)) {
      count += 1;
      if (samples.length < 5) {
        samples.push(line);
      }
    }
  }

  return { errors: count, samples };
}

function summarizeUnit(dir: string): UnitSummary {
  const file = path.join(dir, 'unit.json');
  const raw = readJson(file);
  if (!isRecord(raw)) {
    return { failures: null };
  }

  const direct = getNumber(raw.numFailedTests);
  if (direct !== null) return { failures: direct };

  const legacy = getNumber(raw.failed);
  if (legacy !== null) return { failures: legacy };

  if (isRecord(raw.summary)) {
    const summaryValue = getNumber(raw.summary.numFailedTests);
    if (summaryValue !== null) return { failures: summaryValue };
  }

  return { failures: null };
}

function summarizeE2E(dir: string): E2ESummary {
  const file = path.join(dir, 'e2e.json');
  const raw = readJson(file);
  if (raw === null) {
    return { failures: null };
  }

  if (isRecord(raw) && typeof raw.status === 'string' && raw.status !== 'passed') {
    return { failures: 1 };
  }

  const failures = countPlaywrightFailures(raw);
  return { failures: failures }; // 0 if none or data missing deeper
}

function countPlaywrightFailures(node: unknown): number {
  if (!isRecord(node)) return 0;

  let failures = 0;
  const tests = Array.isArray(node.tests) ? node.tests : [];
  for (const test of tests) {
    if (!isRecord(test)) continue;
    const results = Array.isArray(test.results) ? test.results : [];
    for (const result of results) {
      if (!isRecord(result)) continue;
      const status = typeof result.status === 'string' ? result.status : undefined;
      const hasError = 'error' in result && result.error != null;
      if ((status && status !== 'passed') || hasError) failures += 1;
    }
  }

  const suites = Array.isArray(node.suites) ? node.suites : [];
  for (const suite of suites) {
    failures += countPlaywrightFailures(suite);
  }

  return failures;
}

function summarizeA11y(dir: string): A11ySummary {
  const a11yFile = path.join(dir, 'a11y.json');
  const e2eFile = path.join(dir, 'e2e.json');
  const rawA11y = readJson(a11yFile);
  const rawE2E = readJson(e2eFile);

  if (!isRecord(rawA11y) && !isRecord(rawE2E)) {
    return { violations: null };
  }

  if (isRecord(rawA11y)) {
    const direct = getNumber(rawA11y.violations);
    if (direct !== null) return { violations: direct };

    if (isRecord(rawA11y.summary)) {
      const summaryValue = getNumber(rawA11y.summary.violations);
      if (summaryValue !== null) return { violations: summaryValue };
    }
  }

  if (isRecord(rawE2E) && isRecord(rawE2E.a11y)) {
    const fallback = getNumber(rawE2E.a11y.violations);
    if (fallback !== null) return { violations: fallback };
  }

  return { violations: null };
}

function summarizeBundle(dir: string): BundleSummary {
  const file = path.join(dir, 'bundle.json');
  const raw = readJson(file);
  if (!isRecord(raw)) {
    return { app_js_kb: null, vendor_kb: null };
  }

  return {
    app_js_kb: getNumber(raw.app_js_kb),
    vendor_kb: getNumber(raw.vendor_kb),
  };
}

function summarizePerf(dir: string): PerfSummary {
  const file = path.join(dir, 'perf.json');
  const raw = readJson(file);
  if (!isRecord(raw)) {
    return { ttci_ms: null };
  }

  return {
    ttci_ms: getNumber(raw.ttci_ms),
  };
}

function readJson(filePath: string): Record<string, unknown> | unknown[] | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const contents = fs.readFileSync(filePath, 'utf8');
    if (!contents.trim()) return null;
    return JSON.parse(contents) as Record<string, unknown> | unknown[];
  } catch {
    return null;
  }
}

function readText(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
