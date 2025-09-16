# Resonai Coach System - Playwright Test Suite

Automated smoke tests for the six critical proofs of the Resonai Coach System.

## 🚀 Quick Start

```bash
# Set your app URL (default is https://resonai.vercel.app)
export APP_URL="https://resonai.vercel.app"

# Install and run tests (Firefox focus)
npm i -D @playwright/test
npx playwright install
npx playwright test --project=firefox
```

## 📋 Test Coverage

### 1. **Isolation Proof** (`isolation.spec.ts`)
- Verifies `window.crossOriginIsolated === true` online
- Blocks network and reloads to verify offline isolation
- Checks for COEP/CORP errors during offline reload
- Validates worklet loading from cache

### 2. **Coach Policy Invariants** (`coach_policy.spec.ts`)
- Tests ≤1 hint per second rate limiting
- Verifies ≥4s cooldown per hint ID
- Checks priority swaps at phrase end
- Validates rate limiting through tab changes

### 3. **Privacy & A11y** (`privacy_a11y.spec.ts`)
- Monitors network requests during practice (should be none)
- Checks for `aria-live` or `role="status"` on feedback
- Validates keyboard navigation
- Tests screen reader compatibility

## 🔧 Configuration

### Environment Variables
- `APP_URL`: Target application URL (default: https://resonai.vercel.app)
- `HEADLESS`: Run in headless mode (default: false for debugging)
- `SLOW_MO`: Slow down operations (default: 0)

### Feature Flags
Tests automatically append required feature flags:
- `?coachhud=1` - Enable Coach Debug HUD
- `?coach=1` - Enable coach system
- `?debug=1` - Enable debug logging

## 🚦 CI Lanes & Flake Management

| Lane | Trigger | Runner | Playwright command | Notes |
| --- | --- | --- | --- | --- |
| **PR / Push (Linux)** | `ci.yml` on pull_request & push to `main`/`master` | `ubuntu-latest` | `pnpm run test:e2e:json` (root `playwright.config.ts`) | Runs alongside typecheck, lint, and vitest. Retries twice on CI and uploads `playwright-report/results.json` for summaries. |
| **PR (Windows noweb)** | `e2e-win.yml` on PRs targeting `main`/`develop` | `windows-latest` | `npx playwright test --config=playwright/playwright.noweb.config.ts --project=firefox` | Uses production build + `npm run start`. Web server is launched outside Playwright, mirroring manual deployments. |
| **Nightly (Root config)** | `e2e-nightly.yml` scheduled `0 2 * * *` UTC | `windows-latest` | `npx playwright test --config=playwright.config.ts --project=firefox` | Exercises Playwright-managed dev server nightly, uploads traces/videos, and posts a GitHub summary of failing specs. |

### Tagging flaky tests

1. **Open a tracking issue** describing the failure mode and link it from the spec.
2. **Annotate the test** so CI surfaces the flake without muting coverage:
   ```ts
   import { test, expect } from '@playwright/test';

   test('coach hint debounce works', async ({ page }, testInfo) => {
     testInfo.annotations.push({ type: 'flaky', description: 'tracking gh-1234' });
     // optional safety net when the flake only happens on CI
     if (process.env.CI) test.slow();

     /* test body */
   });
   ```
   The annotation appears in HTML/JSON reports and in GitHub summaries, while retries continue to run.
3. **Escalate only when necessary** – use `test.fixme()`/`test.skip()` as a last resort and point to the tracking issue in the reason string.
4. **Remove the annotation** once the issue is resolved so nightlies return to zero reported flakes.

## 🧪 Test Structure

```
playwright/
├── README.md                 # This file
├── playwright.config.ts      # Playwright configuration
├── tests/
│   ├── isolation.spec.ts     # Isolation proof tests
│   ├── coach_policy.spec.ts  # Coach policy tests
│   └── privacy_a11y.spec.ts  # Privacy & accessibility tests
└── utils/
    ├── test-helpers.ts       # Common test utilities
    └── debug-hooks.ts        # Debug hook helpers
```

## 🐛 Debugging

### Running Individual Tests
```bash
# Run specific test file
npx playwright test tests/isolation.spec.ts --project=firefox

# Run specific test by name
npx playwright test --grep "should maintain isolation offline" --project=firefox
```

### Debug Mode
```bash
# Run with debug UI
npx playwright test --debug --project=firefox

# Run in headed mode with slow motion
HEADLESS=false SLOW_MO=1000 npx playwright test --project=firefox
```

### Screenshots and Videos
```bash
# Generate screenshots on failure
npx playwright test --project=firefox --screenshot=only-on-failure

# Record videos
npx playwright test --project=firefox --video=on
```

### Handling timeouts
- **Reproduce locally with the inspector**: `PWDEBUG=1 npx playwright test --project=firefox tests/isolation.spec.ts` pauses on each step so you can see where the stall occurs.
- **Bump the timeout for a single spec** when debugging slow paths:
  ```ts
  test('slow boot sequence', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/?coachhud=1&coach=1&debug=1');
    /* ... */
  });
  ```
- **Capture protocol chatter** with `DEBUG=pw:api` to see the Playwright commands emitted before a hang.
- **Check server logs** – when using the root config Playwright starts `npm run dev` in the same shell, so log output appears directly in the terminal.

### Trace review
- Traces are recorded on the first retry (`trace: 'on-first-retry'`). On CI they are zipped under `playwright-report/*.zip`.
- Inspect a local trace:
  ```bash
  npx playwright show-trace test-results/isolation-proof-retry1/trace.zip
  ```
- HTML reports contain inline trace viewers. Open them with `npx playwright show-report` after a run or download the artifact from CI and run the same command locally.

## 📊 Test Results

### Expected Output
```
Running 6 tests using 1 worker

  ✓ [firefox] › tests/isolation.spec.ts:3:1 › should maintain isolation online (2.1s)
  ✓ [firefox] › tests/isolation.spec.ts:8:1 › should maintain isolation offline (3.2s)
  ✓ [firefox] › tests/coach_policy.spec.ts:3:1 › should rate limit hints to 1 per second (1.8s)
  ✓ [firefox] › tests/coach_policy.spec.ts:8:1 › should enforce 4s anti-repeat cooldown (2.5s)
  ✓ [firefox] › tests/privacy_a11y.spec.ts:3:1 › should not make network requests during practice (1.2s)
  ✓ [firefox] › tests/privacy_a11y.spec.ts:8:1 › should have accessible feedback (1.1s)

6 passed (12.0s)
```

### Failure Investigation
When tests fail, check:
1. **Console logs** for error messages
2. **Screenshots** in `test-results/` directory
3. **Videos** for step-by-step reproduction
4. **Network tab** for unexpected requests

## 🎛️ Feature Flags & Environment Overrides

### Query-string feature flags
- All specs default to `?coachhud=1&coach=1&debug=1` so the Coach HUD, coach engine, and verbose logging are available.
- To experiment with additional flags (for example `betaOrb=1`), export the desired query string and update the `page.goto()` call to source it from the environment while you iterate:
  ```ts
  const flagQuery = process.env.PLAYWRIGHT_FLAG_QUERY ?? 'coachhud=1&coach=1&debug=1';
  await page.goto(`/?${flagQuery}`);
  ```
- Run the spec with your overrides:
  ```bash
  PLAYWRIGHT_FLAG_QUERY='coachhud=1&coach=1&debug=1&betaOrb=1' \
    npx playwright test tests/privacy_a11y.spec.ts --project=firefox
  ```
  Combine with `PW_DISABLE_WEBSERVER=1` and `--base-url="https://staging.resonai.app"` when targeting a deployed environment instead of the local dev server.

### Next.js environment variables
- Any environment variable you export before `npx playwright test` is inherited by the `npm run dev` web server that Playwright spawns.
- Example: run the PR lane locally with an alternate coach build and a longer global timeout.
  ```bash
  NEXT_PUBLIC_COACH_BUILD=staging PWDEBUG=console \
    npx playwright test --config=playwright.config.ts --project=firefox --timeout=180000
  ```
- When the server is already running (e.g. staging), switch to the "noweb" config instead:
  ```bash
  PW_DISABLE_WEBSERVER=1 \
    npx playwright test --config=playwright/playwright.noweb.config.ts \
    --project=firefox --base-url="https://staging.resonai.app"
  ```
- Persisted feature flag experiments that rely on `localStorage` can be set ahead of navigation using Playwright hooks, for example:
  ```ts
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ff.haptics', 'false'));
  });
  ```
  Remove the override when you are finished so CI continues to exercise the default stack.

## 🔍 Manual Testing

Some tests require manual intervention:

### Device-Flip Resilience
- Use DevTools snippets to monitor device changes
- Test USB↔BT switching manually
- Verify 10-minute stability

### Prosody Fairness
- Use DevTools snippets to test threshold scaling
- Try exaggerated vs gentle rises
- Check anti-gaming measures

### Loudness Guard
- Test at different mic distances
- Verify Orb shimmer behavior
- Check baseline normalization

## 📝 Test Maintenance

### Adding New Tests
1. Create test file in `tests/` directory
2. Follow naming convention: `feature.spec.ts`
3. Use `test.describe()` for grouping
4. Include proper assertions and cleanup

### Updating Existing Tests
1. Update test descriptions to match new behavior
2. Adjust timeouts if needed
3. Update selectors if UI changes
4. Verify debug hooks still work

### Debug Hooks
Tests rely on these debug hooks (if available):
- `window.__coachEmits` - Coach hint emissions
- `window.__prosodyThresholds` - Prosody threshold values
- `window.__coachSimulate` - Simulate coach events

## 🚨 Known Issues

- **Device changes** cannot be fully automated
- **Screen reader testing** requires manual verification
- **Network blocking** may not work in all environments
- **Timing-sensitive tests** may be flaky in CI

## 📞 Support

For test issues or questions:
1. Check console logs for error details
2. Review test results and screenshots
3. Verify feature flags are enabled
4. Check if debug hooks are available

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-XX  
**Compatible with:** Resonai Coach System v1.0+

