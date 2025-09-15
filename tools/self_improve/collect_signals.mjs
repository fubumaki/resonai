// tools/self_improve/collect_signals.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'reports');
const toolsDir = path.join(root, 'tools', 'self_improve');
fs.mkdirSync(reportsDir, { recursive: true });
fs.mkdirSync(toolsDir, { recursive: true });

const readJson = (p) => {
  try { return JSON.parse(fs.readFileSync(path.join(reportsDir, p), 'utf8')); }
  catch { return null; }
};
const readTxt = (p) => {
  try { return fs.readFileSync(path.join(reportsDir, p), 'utf8'); }
  catch { return ''; }
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
  const j = readJson('unit.json') || {};
  const failures = j.numFailedTests ?? j.failed ?? j.summary?.numFailedTests ?? 0;
  return { failures };
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
  if (!j) return { failures: 0 };
  const failures = (j.status && j.status !== 'passed') ? 1 : countPlaywrightFailures(j);
  return { failures };
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

