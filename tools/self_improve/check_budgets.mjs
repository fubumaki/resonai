// tools/self_improve/check_budgets.mjs
import fs from 'node:fs';

const [, , budgetsPath, signalsPath] = process.argv;
if (!budgetsPath || !signalsPath) {
  console.error('Usage: node check_budgets.mjs <budgets.json> <signals.json>');
  process.exit(1);
}

const budgets = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));
const signals = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));

const failures = [];

function cmp(name, actual, limit) {
  if (typeof limit === 'number' && typeof actual === 'number' && actual > limit) {
    failures.push(`${name}: ${actual} > ${limit}`);
  }
}

cmp('typescript.errors', signals.typescript?.errors ?? 0, budgets.typescript?.errors);
cmp('eslint.errors',     signals.eslint?.errors ?? 0,     budgets.eslint?.errors);
cmp('eslint.warnings',   signals.eslint?.warnings ?? 0,   budgets.eslint?.warnings);
cmp('a11y.violations',   signals.a11y?.violations ?? 0,   budgets.a11y?.violations);
cmp('unit.failures',     signals.unit?.failures ?? 0,     budgets.unit?.failures);
cmp('e2e.failures',      signals.e2e?.failures ?? 0,      budgets.e2e?.failures);

if (budgets.bundle) {
  cmp('bundle.app_js_kb', signals.bundle?.app_js_kb ?? 0, budgets.bundle.app_js_kb);
  cmp('bundle.vendor_kb', signals.bundle?.vendor_kb ?? 0, budgets.bundle.vendor_kb);
}
if (budgets.perf) {
  cmp('perf.ttci_ms', signals.perf?.ttci_ms ?? 0, budgets.perf.ttci_ms);
}

if (failures.length) {
  console.error('[budgets] FAIL\n' + failures.map(f => ' - ' + f).join('\n'));
  process.exit(1);
} else {
  console.log('[budgets] OK');
}

