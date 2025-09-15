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

