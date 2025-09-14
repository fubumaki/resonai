# Resonai Coach System - QA Package

Complete testing and validation package for the Resonai Coach System's six critical proofs.

## 🎯 Overview

This package provides automated and manual testing tools to validate the six critical proofs required for the Resonai Coach System:

1. **Isolation Proof** - COOP/COEP headers, offline worklet loading
2. **Device-Flip Resilience** - USB↔BT switching, 10-minute stability
3. **Coach Policy Invariants** - 1/sec rate limiting, 4s anti-repeat
4. **Prosody Fairness** - Anti-gaming, threshold scaling
5. **Loudness Guard** - Distance consistency, visual feedback
6. **Privacy & A11y** - Local-only processing, screen reader support

## 📦 Package Contents

### **Automated Testing**
- **Playwright Test Suite** (`playwright/`) - Automated browser tests
- **GitHub Actions Workflow** (`.github/workflows/qa-smokes.yml`) - CI/CD integration
- **Test Configuration** (`playwright.config.ts`) - Test runner setup

### **Manual Testing Tools**
- **DevTools Snippets** (`devtools_snippets.js`) - Console commands for testing
- **Diagnostics Page** (`labs/diagnostics.tsx`) - Real-time monitoring dashboard
- **QA Snapshot Template** (`QA_SNAPSHOT_TEMPLATE.md`) - Stakeholder reporting

### **Code Integration**
- **Next.js Headers** (`snippets/next.config.headers.example.js`) - COOP/COEP setup
- **Service Worker** (`snippets/sw.coopcoep.example.js`) - Header passthrough
- **Debug Hooks** (`snippets/coach_debug_hooks.ts`) - Coach system integration
- **Prosody Exposure** (`snippets/prosody_debug_exposure.ts`) - Threshold monitoring

## 🚀 Quick Start

### **1. Install Dependencies**
```bash
npm i -D @playwright/test
npx playwright install --with-deps firefox
```

### **2. Configure Headers**
Copy `snippets/next.config.headers.example.js` to your `next.config.js`:
```bash
cp snippets/next.config.headers.example.js next.config.js
```

### **3. Add Debug Hooks**
Add to your coach demo page:
```typescript
import { useCoachDebugHooks } from '../snippets/coach_debug_hooks';

// In your component
useCoachDebugHooks(); // Only when ?coachhud=1&debug=1
```

### **4. Run Tests**
```bash
# Set target URL
export APP_URL="https://resonai.vercel.app"

# Run all tests
npm run test:e2e

# Run specific proofs
npm run test:isolation
npm run test:coach
npm run test:privacy
```

## 🧪 Testing Workflow

### **Automated Tests (CI/CD)**
1. **Isolation Proof** - Verifies COOP/COEP headers online/offline
2. **Coach Policy** - Tests rate limiting and anti-repeat logic
3. **Privacy & A11y** - Monitors network requests and accessibility

### **Manual Tests (5-10 minutes)**
1. **Device-Flip Resilience** - Use DevTools snippets for USB↔BT testing
2. **Prosody Fairness** - Test threshold scaling and anti-gaming
3. **Loudness Guard** - Verify distance consistency and visual feedback

### **Evidence Collection**
1. **Screenshots** - Capture test results and UI states
2. **Console Logs** - Export debug data and metrics
3. **QA Snapshot** - Fill out stakeholder report template

## 📊 Test Results

### **Pass Criteria**
- ✅ **Isolation** - `window.crossOriginIsolated === true` online/offline
- ✅ **Device-Flip** - Automatic detection and re-init on device changes
- ✅ **Coach Policy** - ≤1 hint/sec, ≥4s anti-repeat per hint ID
- ✅ **Prosody Fairness** - Thresholds scale, anti-gaming effective
- ✅ **Loudness Guard** - Consistent behavior across distances
- ✅ **Privacy & A11y** - No network requests, screen reader support

### **Release Posture**
- **🟢 Green** - All 6 proofs pass → Controlled beta (Firefox/Windows)
- **🟡 Yellow** - 4-5 proofs pass → Broader desktop testing
- **🔴 Red** - <4 proofs pass → Not ready for release

## 🔧 Configuration

### **Environment Variables**
```bash
APP_URL=https://resonai.vercel.app  # Target application URL
HEADLESS=false                       # Run in headed mode for debugging
SLOW_MO=1000                        # Slow down operations (ms)
```

### **Feature Flags**
- `?coachhud=1` - Enable Coach Debug HUD
- `?coach=1` - Enable coach system
- `?debug=1` - Enable debug logging

### **Debug Hooks**
- `window.__coachEmits` - Coach hint emissions
- `window.__coachSimulate` - Simulate coach events
- `window.__prosodyThresholds` - Prosody threshold values
- `window.__coachDebugState` - Current coach state

## 🐛 Troubleshooting

### **Common Issues**
1. **Tests fail** - Check feature flags are enabled
2. **Debug hooks missing** - Verify debug mode is active
3. **Isolation fails** - Check COOP/COEP headers are set
4. **Network requests** - Verify local-only processing

### **Debug Commands**
```javascript
// Check isolation
console.log('Isolated:', window.crossOriginIsolated);

// Check coach state
console.log('Coach state:', window.__coachDebugState?.());

// Check prosody thresholds
console.log('Thresholds:', window.__prosodyThresholds);

// Export all data
console.log('QA data:', window.exportQAData?.());
```

## 📝 Reporting

### **QA Snapshot Template**
Use `QA_SNAPSHOT_TEMPLATE.md` to record:
- Pass/fail status for each proof
- Screenshots and evidence
- Blocking issues and owners
- Release recommendation

### **CI Integration**
GitHub Actions automatically:
- Runs tests on PRs and pushes
- Uploads test results as artifacts
- Comments PRs with test summary
- Generates HTML reports

## 🔄 Maintenance

### **Adding New Tests**
1. Create test file in `playwright/tests/`
2. Follow naming convention: `feature.spec.ts`
3. Use `test.describe()` for grouping
4. Include proper assertions and cleanup

### **Updating Debug Hooks**
1. Modify `snippets/coach_debug_hooks.ts`
2. Update integration points
3. Test with `?coachhud=1&debug=1`
4. Verify hooks are accessible

### **Threshold Tuning**
1. Use `snippets/prosody_debug_exposure.ts`
2. Test with different values
3. Verify coach system integration
4. Update default thresholds

## 📞 Support

For issues or questions:
1. Check console logs for error details
2. Review test results and screenshots
3. Verify feature flags are enabled
4. Check if debug hooks are available

---

**Version:** 1.0.0  
**Last Updated:** 2024-01-XX  
**Compatible with:** Resonai Coach System v1.0+

