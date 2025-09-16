// tools/self_improve/collect_signals.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const artifactsDir = path.join(root, '.artifacts');
const toolsDir = path.join(root, 'tools', 'self_improve');
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(artifactsDir, { recursive: true });
fs.mkdirSync(toolsDir, { recursive: true });

const jsonCandidateNames = (p) => {
  const names = new Set([p]);
  if (p === 'unit.json') names.add('vitest.json');
  if (p === 'e2e.json') names.add('playwright.json');
  return [...names];
};

const readJson = (p) => {
  const names = jsonCandidateNames(p);
  const candidates = [
    ...names.map((name) => path.join(artifactsDir, name)),
    ...names.map((name) => path.join(reportsDir, name)),
  ];

  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, 'utf8');
      const start = raw.indexOf('{');
      const payload = start === -1 ? raw : raw.slice(start);
      return JSON.parse(payload);
    } catch (error) {
      continue;
    }
  }

  return null;
};
const readTxt = (p) => {
  try { return fs.readFileSync(path.join(reportsDir, p), 'utf8'); }
  catch { return ''; }
};

const pickNumber = (...values) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
};

const toPercent = (numerator, denominator) => {
  if (!denominator || !Number.isFinite(denominator) || denominator <= 0) return null;
  if (!Number.isFinite(numerator) || numerator < 0) return null;
  return Number(((numerator / denominator) * 100).toFixed(1));
};

function summarizeESLint() {
  const j = readJson('eslint.json');
  const out = { errors: 0, warnings: 0, topRules: [] };
  if (!j) return out;

  const results = Array.isArray(j) ? j : j.results || [];
  const byRule = new Map();
  for (const r of results) {
    out.errors += r.errorCount || 0;
    out.warnings += r.warningCount || 0;
    for (const m of r.messages || []) {
      const key = m.ruleId || m.message || 'unknown';
      byRule.set(key, (byRule.get(key) || 0) + 1);
    }
  }
  out.topRules = [...byRule.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([rule, count]) => ({ rule, count }));
  return out;
}

function summarizeTS() {
  const txt = readTxt('tsc.txt');
  const lines = txt.split('\n');
  const errors = [];
  for (const line of lines) {
    if (/\berror TS\d+/.test(line)) errors.push(line.trim());
  }
  return { errors: errors.length, samples: errors.slice(0, 10) };
}

function summarizeUnit() {
  const j = readJson('unit.json');
  if (!j) {
    return {
      failures: 0,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      todo: 0,
      passRate: null,
      durationMs: null,
      status: 'unknown'
    };
  }

  const summary = (typeof j.summary === 'object' && j.summary) ? j.summary : {};
  const total = pickNumber(summary.numTotalTests, j.numTotalTests, summary.totalTests, j.totalTests) ?? 0;
  const passed = pickNumber(summary.numPassedTests, j.numPassedTests, summary.passed, j.numPassedTests ?? j.passed) ?? 0;
  const failed = pickNumber(summary.numFailedTests, j.numFailedTests, summary.failed, j.numFailedTests ?? j.failed) ?? 0;
  const skipped = pickNumber(
    summary.numPendingTests,
    j.numPendingTests,
    summary.skipped,
    j.skipped,
    summary.numSkippedTests,
    j.numSkippedTests
  ) ?? 0;
  const todo = pickNumber(summary.numTodoTests, j.numTodoTests, summary.todo, j.todo) ?? 0;
  const durationMs = pickNumber(
    summary.duration,
    summary.duration_ms,
    summary.durationMs,
    j.duration,
    j.duration_ms,
    j.durationMs
  );
  const passRate = toPercent(passed, total);
  const status = failed > 0 ? 'failed' : (total > 0 ? 'passed' : 'unknown');

  return {
    failures: failed,
    total,
    passed,
    failed,
    skipped,
    todo,
    passRate,
    durationMs: Number.isFinite(durationMs) ? durationMs : null,
    status
  };
}

function countPlaywrightFailures(node) {
  if (!node) return 0;
  let fails = 0;
  if (Array.isArray(node.tests)) {
    for (const t of node.tests) {
      for (const r of t.results || []) {
        if ((r.status && r.status !== 'passed') || r.error) fails++;
      }
    }
  }
  for (const s of node.suites || []) fails += countPlaywrightFailures(s);
  return fails;
}
function summarizeE2E() {
  const j = readJson('e2e.json');
  if (!j) {
    return {
      failures: 0,
      total: 0,
      passed: 0,
      failed: 0,
      flaky: 0,
      skipped: 0,
      passRate: null,
      durationMs: null,
      status: 'unknown'
    };
  }

  const stats = (typeof j.stats === 'object' && j.stats) ? j.stats : {};
  const passed = pickNumber(stats.expected) ?? 0;
  const failed = pickNumber(stats.unexpected) ?? 0;
  const flaky = pickNumber(stats.flaky) ?? 0;
  const skipped = pickNumber(stats.skipped) ?? 0;
  let total = pickNumber(stats.total);
  if (total == null) total = passed + failed + flaky + skipped;
  const considered = passed + failed + flaky;
  const passRate = toPercent(passed, considered || total);
  const durationMs = pickNumber(stats.duration, j.duration, j.duration_ms, j.durationMs);
  const failures = (j.status && j.status !== 'passed') ? 1 : countPlaywrightFailures(j);
  const status = (j.status && typeof j.status === 'string') ? j.status : (failed > 0 ? 'failed' : 'passed');

  return {
    failures,
    total,
    passed,
    failed,
    flaky,
    skipped,
    passRate,
    durationMs: Number.isFinite(durationMs) ? durationMs : null,
    status
  };
}

function summarizeA11y() {
  const a = readJson('a11y.json');
  const e = readJson('e2e.json');
  const violations = a?.violations ?? a?.summary?.violations ?? e?.a11y?.violations ?? 0;
  return { violations };
}

const signals = {
  generatedAt: new Date().toISOString(),
  eslint: summarizeESLint(),
  typescript: summarizeTS(),
  unit: summarizeUnit(),
  e2e: summarizeE2E(),
  a11y: summarizeA11y(),
  bundle: readJson('bundle.json') || {},
  perf: readJson('perf.json') || {}
};

const outPath1 = path.join(reportsDir, 'signals.json');
const outPath2 = path.join(toolsDir, 'signals.json');
fs.writeFileSync(outPath1, JSON.stringify(signals, null, 2));
fs.writeFileSync(outPath2, JSON.stringify(signals, null, 2));
console.log('[self_improve] signals.json written:', outPath1);

