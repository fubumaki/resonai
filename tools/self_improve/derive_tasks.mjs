// tools/self_improve/derive_tasks.mjs
import fs from 'node:fs';

const signalsPath = 'tools/self_improve/signals.json';
if (!fs.existsSync(signalsPath)) {
  console.log('[derive_tasks] No signals found. Skipping.');
  process.exit(0);
}
const sig = JSON.parse(fs.readFileSync(signalsPath, 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const tasks = [];

if ((sig.typescript?.errors || 0) > 0) {
  tasks.push(`### TypeScript: eliminate ${sig.typescript.errors} errors
- Owner: Cursor Agent
- Labels: type-fix, auto:fix
- Acceptance:
  - \`pnpm run typecheck\` passes (0 errors)
  - No new ESLint warnings/errors
  - Add minimal unit tests if types were masking runtime issues`);
}

if ((sig.eslint?.errors || 0) + (sig.eslint?.warnings || 0) > 0) {
  const top = (sig.eslint?.topRules || []).map(r => \`\${r.rule}\`×\${r.count}\`).join(', ');
  tasks.push(`### ESLint: zero out errors/warnings
- Owner: Cursor Agent
- Labels: lint-fix, auto:fix
- Acceptance:
  - ESLint report shows 0 errors, 0 warnings
  - Address top rules: ${top || 'n/a'}`);
}

if ((sig.a11y?.violations || 0) > 0) {
  tasks.push(`### A11Y: resolve ${sig.a11y.violations} axe violations
- Owner: Cursor Agent
- Labels: a11y, auto:polish
- Acceptance:
  - Axe violations = 0 on affected routes
  - Playwright a11y specs cover regressions`);
}

if ((sig.unit?.failures || 0) > 0) {
  tasks.push(`### Unit: fix failing tests (${sig.unit.failures})
- Owner: Cursor Agent
- Labels: tests, auto:fix
- Acceptance:
  - \`pnpm run test:unit\` passes locally and on CI
  - Remove test flakes or tag quarantined tests with comment & ticket`);
}

if ((sig.e2e?.failures || 0) > 0) {
  tasks.push(`### E2E: stabilize Playwright (${sig.e2e.failures} failures)
- Owner: Cursor Agent
- Labels: e2e, auto:fix
- Acceptance:
  - Critical paths (landing → practice start) are green
  - Add retry policies only where idempotent`);
}

if (tasks.length === 0) {
  console.log('[derive_tasks] No new tasks derived (all green).');
  process.exit(0);
}

const section = `
## Auto-sourced (${today})

${tasks.join('\n\n')}
`;

const file = 'TASKS.md';
let md = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '# TASKS\n\n';
md += section;
fs.writeFileSync(file, md);
console.log('[derive_tasks] Appended tasks for', today);

