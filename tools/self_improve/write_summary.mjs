// tools/self_improve/write_summary.mjs
import fs from 'node:fs';
import path from 'node:path';

const summaryPath = process.argv[2] || process.env.GITHUB_STEP_SUMMARY;
if (!summaryPath) {
  console.error('[ci-summary] No summary target provided.');
  process.exit(0);
}

const root = process.cwd();
const signalsPath = path.join(root, 'reports', 'signals.json');

let signals;
try {
  signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
} catch (error) {
  console.warn(`[ci-summary] Unable to read signals.json at ${signalsPath}: ${error.message}`);
  process.exit(0);
}

const ensureNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const formatRate = (rate) => (typeof rate === 'number' && Number.isFinite(rate) ? `${rate.toFixed(1)}%` : '—');
const formatRatio = (passed, total) => {
  const p = ensureNumber(passed);
  const t = ensureNumber(total);
  if (t === 0) return `${p}/—`;
  return `${p}/${t}`;
};
const formatDuration = (ms) => {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) {
    const value = totalSeconds >= 10 ? Math.round(totalSeconds) : Number(totalSeconds.toFixed(1));
    return `${value}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  const secondsValue = seconds >= 10 ? Math.round(seconds) : Number(seconds.toFixed(1));
  return `${minutes}m ${secondsValue}s`;
};
const formatCount = (value) => ensureNumber(value).toString();
const statusLabel = (status) => {
  switch (status) {
    case 'passed':
      return '✅ Passed';
    case 'failed':
      return '❌ Failed';
    case 'flaky':
      return '⚠️ Flaky';
    case 'unknown':
    default:
      return '⚠️ Unknown';
  }
};

const lines = [];
lines.push('# CI Quality Summary');
if (signals.generatedAt) {
  try {
    const timestamp = new Date(signals.generatedAt);
    if (!Number.isNaN(timestamp.valueOf())) {
      lines.push(`_Generated: ${timestamp.toUTCString()}_`);
    }
  } catch {}
}
lines.push('');
lines.push('## ✅ Automated Tests');
lines.push('');
lines.push('| Suite | Pass rate | Passed/Total | Failed | Flaky | Skipped | Duration | Status |');
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');

const unit = signals.unit || {};
const e2e = signals.e2e || {};
lines.push(`| Vitest | ${formatRate(unit.passRate)} | ${formatRatio(unit.passed, unit.total)} | ${formatCount(unit.failed ?? unit.failures)} | ${formatCount(unit.flaky ?? 0)} | ${formatCount(unit.skipped)} | ${formatDuration(unit.durationMs)} | ${statusLabel(unit.status)} |`);
lines.push(`| Playwright | ${formatRate(e2e.passRate)} | ${formatRatio(e2e.passed, e2e.total)} | ${formatCount(e2e.failed ?? e2e.failures)} | ${formatCount(e2e.flaky)} | ${formatCount(e2e.skipped)} | ${formatDuration(e2e.durationMs)} | ${statusLabel(e2e.status)} |`);
lines.push('');

const ts = signals.typescript || {};
const lint = signals.eslint || {};
const a11y = signals.a11y || {};
const gateLine = (ok, label, value) => `${ok ? '✅' : '⚠️'} **${label}:** ${value}`;
lines.push('## 📊 Quality Gates');
lines.push('');
const tsErrors = ensureNumber(ts.errors);
lines.push(gateLine(tsErrors === 0, 'TypeScript errors', tsErrors));
const lintErrors = ensureNumber(lint.errors);
const lintWarnings = ensureNumber(lint.warnings);
lines.push(gateLine(lintErrors === 0, 'ESLint errors', `${lintErrors} (warnings: ${lintWarnings})`));
const a11yViolations = ensureNumber(a11y.violations);
lines.push(gateLine(a11yViolations === 0, 'Accessibility violations', a11yViolations));
lines.push('');

lines.push('## 📁 Artifacts');
lines.push('');
lines.push('- `reports/unit.json` — Vitest JSON reporter output');
lines.push('- `reports/e2e.json` — Playwright JSON reporter output');
lines.push('- `reports/signals.json` — Aggregated SSOT metrics for CI quality gates');
lines.push('');

fs.appendFileSync(summaryPath, `${lines.join('\n')}\n`);
console.log(`[ci-summary] Summary written to ${summaryPath}`);
