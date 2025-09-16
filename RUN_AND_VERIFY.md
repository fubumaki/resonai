<!-- ssot-start -->
> **Last green commit:** `4498af8` (4498af88091cc436a7aa6aa4e61030e2ee91f451)
> **Date:** `2025-09-16 06:58:50 UTC`
> **Vitest:** `137/137` passing, duration `00:00:02`
> **Playwright:** `unavailable/—` passing, duration `—`
> **Top flakiest:**  
> - `none`: `0` failures  
<!-- ssot-end -->

# Run and Verify Guide

Quick commands to run the Instant Practice feature and verify everything works.

## 🚀 Quick Start

### 1. Start Development Server
```bash
npm run dev:ci
```
Server runs on http://localhost:3003

### 2. Run E2E Tests (No Web Server)
```bash
npx playwright test --config=playwright/playwright.noweb.config.ts --project=firefox
```

### 3. Run E2E Tests (Playwright-Managed Server)
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

### CI Artifacts
When tests fail in CI, check the artifacts:
- **Playwright HTML Report**: Interactive test results with traces and videos
- **Test Artifacts**: Screenshots, videos, and traces for failed tests
- **JSON Reports**: Machine-readable test results for analysis

See [CI_ARTIFACTS.md](./CI_ARTIFACTS.md) for detailed artifact access instructions.

### Local Debugging
```bash
# View local Playwright report
pnpm exec playwright show-report

# Run tests with UI for debugging
pnpm run test:e2e:ui

# Generate JSON reports locally
pnpm run test:e2e:json
pnpm run test:unit:json
```

### Isolation sanity check
```bash
pnpm run check:isolation -- --browser=chromium
pnpm run check:isolation -- --browser=firefox
```
The script fetches `/` and reports COOP/COEP header values plus the runtime `crossOriginIsolated` flag.
If Firefox reports `crossOriginIsolated: false`, open `about:config` and set `privacy.resistFingerprinting` to `false` before re-running. Use `--strict` to make the command fail when isolation is false.

### Practice reset harness selectors
- Session counters: `data-testid="progress-count"`, `data-testid="progress-bar"`, `data-testid="session-progress-status"`
- Settings controls: `data-testid="settings-button"`, `data-testid="reset-everything"`
- Run harness headless: `npx playwright test playwright/tests/practice-session-reset-harness.spec.ts --project=firefox-pr`

### Common Issues
1. **Dialog not showing**: Check E2 variant is 'A' and primer flag is enabled
2. **Analytics not working**: Check `/api/events` endpoint is responding
3. **Tests timing out**: Increase timeout in config or check server health
4. **COOP/COEP errors**: Verify headers are set in `next.config.ts`
5. **CI test failures**: Download and review Playwright artifacts from GitHub Actions

## 🔒 Isolation Checker

### Quick Header Check
```bash
# Check COOP/COEP headers and crossOriginIsolated status
pnpm run check:isolation

# Check specific URL (e.g., Vercel preview)
pnpm run check:isolation https://your-preview-url.vercel.app
```

### What the Script Checks
- **COOP Header**: `Cross-Origin-Opener-Policy: same-origin`
- **COEP Header**: `Cross-Origin-Embedder-Policy: require-corp`
- **Browser Context**: Provides script to check `window.crossOriginIsolated`

### Firefox Edge Case
Firefox with `privacy.resistFingerprinting` enabled may report `crossOriginIsolated` as `false` even with correct headers. This is expected behavior:

```javascript
// Run in browser console to check
console.log('crossOriginIsolated:', window.crossOriginIsolated);
console.log('SharedArrayBuffer:', typeof SharedArrayBuffer !== 'undefined');

// Check if Firefox with resistFingerprinting
const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
console.log('Firefox detected:', isFirefox);
```

**Troubleshooting Steps:**
1. **Headers correct but `crossOriginIsolated` false in Firefox**: This is expected with `privacy.resistFingerprinting` enabled
2. **Headers missing**: Check `next.config.js` COOP/COEP configuration
3. **COEP/CORP errors in console**: Check that all resources are same-origin or have proper CORP headers

**References:**
- [MDN: crossOriginIsolated](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated)
- [MDN: privacy.resistFingerprinting](https://developer.mozilla.org/en-US/docs/Web/Privacy/Privacy_settings_in_Firefox#privacy.resistFingerprinting)

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
