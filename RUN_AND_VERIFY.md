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
