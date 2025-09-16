# Run and Verify Guide

## CI Single Source of Truth (SSOT)

**Last green commit:** _pending — current run has failures (Playwright (firefox): 22 failed)._ 
**Current commit:** `b22e630` (2025-09-16 05:57 UTC)
Generated: 2025-09-16 06:33 UTC — see [.artifacts/SSOT.md](.artifacts/SSOT.md) for full artifact details.

| Suite | Passed | Failed | Skipped | Flaky | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Vitest | 85 | 0 | 0 | 0 | 0.08s |
| Playwright (firefox) | 34 | 22 | 12 | 0 | 6m 5.42s |

**Flakiest specs**

1. `playwright/tests/a11y_min.spec.ts` — permission primer dialog is accessible when shown (failed ×1) — 10.8s — Locator: getByRole('dialog')
2. `playwright/tests/analytics_beacon.spec.ts` — analytics events are posted (sendBeacon stub + forced flush) (failed ×1) — 10.4s — Expected: ArrayContaining ["screen_view", "permission_requested"]
3. `playwright/tests/smoke.spec.ts` — fallback to default mic shows toast (failed ×1) — 8.95s — Locator: locator('#toasts')
4. `playwright/tests/smoke.spec.ts` — data privacy page is accessible (failed ×1) — 8.01s — Locator: getByText('Local‑first by design')
5. `playwright/tests/mic_flow.spec.ts` — one-tap mic toggles recording and emits analytics (failed ×1) — 7.24s — Locator: locator('.pitch-meter')

## How to regenerate SSOT locally

`ash
pnpm run test:unit:json
pnpm run test:e2e:json
pnpm exec tsx scripts/ci-summary.ts
`

Regenerate the SSOT whenever the reporter artifacts change so the top block stays accurate.
Quick commands to run the Instant Practice feature and verify everything works.

## 🚀 Quick Start

### 1. Start Development Server
```bash
npm run dev:ci
```
Server runs on http://localhost:3003

### 2. Start Background Agent (Optional)
```bash
pnpm agent:start
```
This starts a self-perpetuating background worker that monitors and manages automated tasks. The worker respects the `.agent/LOCK` kill-switch file - create this file to stop the agent, remove it to restart.

#### Agent Configuration
The agent behavior can be customized via `.agent/config.json` or environment variables:

**Configuration file** (`.agent/config.json`):
```json
{
  "maxJobs": 2,
  "maxFiles": 10,
  "maxLines": 200,
  "jobTtlMs": 43200000,
  "maxAttempts": 3,
  "backoffMs": 900000
}
```

**Environment variables** (override config file):
- `AGENT_MAX_JOBS`: Maximum concurrent jobs (default: 2)
- `AGENT_MAX_FILES`: Maximum files per job (default: 10)
- `AGENT_MAX_LINES`: Maximum lines of code per job (default: 200)
- `AGENT_JOB_TTL_MS`: Job time-to-live in milliseconds (default: 12 hours)
- `AGENT_MAX_ATTEMPTS`: Maximum retry attempts per job (default: 3)
- `AGENT_BACKOFF_MS`: Backoff delay in milliseconds (default: 15 minutes)

**Control the agent**:
- **Stop**: `touch .agent/LOCK` (or create the file manually)
- **Restart**: `rm .agent/LOCK` (or delete the file)

### 3. Run E2E Tests (No Web Server)
```bash
npx playwright test --config=playwright/playwright.noweb.config.ts --project=firefox
```

### 4. Run E2E Tests (Playwright-Managed Server)
```bash
npx playwright test --config=playwright.config.ts --project=firefox
```

## 🧪 Test Commands

### Core Specs Only
```bash
npx playwright test --config=playwright/playwright.noweb.config.ts --project=firefox --grep "instant practice route loads|one-tap mic toggles|E1/E2 variants assign|COOP/COEP headers present|permission primer dialog is accessible"
```

### Specific Test Files
```bash
# Smoke test
npx playwright test playwright/tests/smoke.spec.ts --config=playwright/playwright.noweb.config.ts --project=firefox

# Analytics test
npx playwright test playwright/tests/analytics.spec.ts --config=playwright/playwright.noweb.config.ts --project=firefox

# Health check
npx playwright test playwright/tests/health.spec.ts --config=playwright/playwright.noweb.config.ts --project=firefox
```

### With UI (Debug Mode)
```bash
npx playwright test --config=playwright/playwright.noweb.config.ts --project=firefox --ui
```

## 📁 JSON Reports & SSOT Checks

Automated runs emit machine-readable artifacts under `reports/` so CI and QA can share a single source of truth.

1. **Generate local JSON reporters**
   ```bash
   pnpm run test:unit:json || true
   pnpm run test:e2e:json || true
   pnpm run a11y:json || true
   ```
2. **Inspect artifacts**
   ```bash
   # Vitest details
   jq '.numFailedTests' reports/unit.json

   # Playwright run statistics
   jq '.stats' reports/e2e.json
   ```
3. **Rebuild the SSOT snapshot**
   ```bash
   node tools/self_improve/collect_signals.mjs
   jq '.' reports/signals.json
   diff -u reports/signals.json tools/self_improve/signals.json
   ```
   `reports/signals.json` (mirrored at `tools/self_improve/signals.json`) powers CI budgets and summaries—verify it before sign-off.
4. **Review CI artifacts**
   - Download the `reports` artifact from the GitHub Actions run to view the same `unit.json`, `e2e.json`, and aggregated `signals.json` files.
   - The workflow summary highlights pass rates and gate metrics sourced from those JSON files.

## 🗂️ Research Summary Validation

Run the Codex summary validator before publishing or editing research notes to ensure metadata and citations meet guardrails.

```bash
npm run codex:validate-summaries
```

## 🔧 Common Fixes

### Port Already in Use
```bash
# Kill processes on port 3003
powershell -ExecutionPolicy Bypass -File scripts/kill-port.ps1

# Or manually
netstat -ano | findstr :3003
taskkill /PID <PID> /F
```

### Tests Not Finding Server
1. Ensure dev server is running: `npm run dev:ci`
2. Check server is responding: `curl http://localhost:3003/api/healthz`
3. Use no-web config: `--config=playwright/playwright.noweb.config.ts`

### PowerShell Script Issues
```bash
# Run with explicit execution policy
powershell -ExecutionPolicy Bypass -File scripts/run-e2e.ps1 -UseExistingServer
```

### TypeScript Errors in Tests
```bash
# Check TypeScript config
npx tsc --noEmit --project tsconfig.playwright.json
```

## 📊 Analytics Dashboard

Visit http://localhost:3003/analytics to see:
- TTV metrics (P50, P90)
- Mic grant rate
- Activation rate
- Recent events

## 🎯 Feature Flags

Test different variants:
```javascript
// In browser console
localStorage.setItem('ab:E2', 'A'); // Show primer dialog
localStorage.setItem('ab:E2', 'B'); // Skip primer dialog
localStorage.setItem('ff.permissionPrimerShort', 'true'); // Enable primer
```

## 🐛 Debugging

### Check Console Logs
- Dev server logs show analytics events
- Browser console shows feature flag states
- Playwright traces in `test-results/`

### Common Issues
1. **Dialog not showing**: Check E2 variant is 'A' and primer flag is enabled
2. **Analytics not working**: Check `/api/events` endpoint is responding
3. **Tests timing out**: Increase timeout in config or check server health
4. **COOP/COEP errors**: Verify headers are set in `next.config.ts`

## 🚀 Production Checklist

Before deploying:
- [ ] All core specs pass
- [ ] Analytics events flowing to `/api/events`
- [ ] Feature flags default to safe values
- [ ] COOP/COEP headers present
- [ ] Health check endpoint responding
- [ ] TTV metrics within acceptable range

## 📈 Performance Targets

- **TTV P50**: ≤ 2s
- **TTV P90**: ≤ 5s  
- **Mic Grant Rate**: ≥ 85%
- **Activation Rate**: ≥ 40%

## 🚀 Pilot Runbook

### Before enabling flags in prod

1. **Build & deploy to staging**, flags **ON** for `/try` & primer (E2A)
2. **Run local smoke**:
   ```bash
   npx playwright test --config=playwright/playwright.noweb.config.ts --project=firefox
   ```
3. **Verify dashboard**: TTV p50/p90, Mic grant %, Activation %, last 20 events

### Acceptance thresholds to flip ON in prod

- **TTV p50** ≤ **2s**; **p90** ≤ **5s**
- **Mic grant** ≥ **85%**
- **Activation** ≥ **40%**

### On enable

- Start with **10–20%** of traffic (or scoped cohort via flag)
- Watch dashboards for the first hour, then daily D1/D7

### Rollback plan

- Single flag killswitch for `/try`
- Revert to E2B (native prompt) if E2A primer underperforms mic grants by >10%

## 🎯 "Done-done" checklist (pilot quality bar)

- [ ] `analytics_beacon.spec.ts` and `analytics_api.spec.ts` **GREEN** locally & in CI
- [ ] `/api/events` supports `DELETE` (tests reset store)
- [ ] Nightly root-config run **GREEN** (isolation & headers)
- [ ] `/analytics` dashboard shows sane values under pilot load
- [ ] **RUN_AND_VERIFY.md** updated with commands + acceptance thresholds
- [ ] Flags configured for staged rollout + killswitch
