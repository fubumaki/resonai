# Resonai Coach System - Run & Verify Guide
## Execute Six Proofs, Collect Evidence, Make Release Call

**Target:** Complete QA validation in 30-45 minutes  
**Environment:** Firefox on Windows 11  
**URL:** https://resonai.vercel.app  
**Commit:** b989831

---

## 0) Quick Sanity Check (5 min)

### **Pre-flight Checklist**
- [ ] **Debug hooks wired:**
  - `/coach-demo` includes `coach_debug_hooks.ts` when `?coachhud=1&debug=1`
  - Prosody labs expose `__prosodyThresholds` when `?debug=1`
- [ ] **COOP/COEP headers configured** in `next.config.js` (or SW passthrough if needed)
- [ ] **Target URL set:**
  ```bash
  # macOS/Linux
  export APP_URL="https://resonai.vercel.app"
  
  # PowerShell
  $env:APP_URL="https://resonai.vercel.app"
  ```

### **Verify Debug Hooks**
```javascript
// Open DevTools Console and run:
console.log('Coach hooks:', typeof window.__coachEmits !== 'undefined');
console.log('Prosody hooks:', typeof window.__prosodyThresholds !== 'undefined');
console.log('Simulation:', typeof window.__coachSimulate !== 'undefined');
```

---

## 1) Run Automated Smokes (10 min)

### **Execute Tests**
```bash
# Install Playwright (if not already done)
npm i -D @playwright/test
npx playwright install

# Run Firefox smoke tests
npx playwright test --project=firefox

# View detailed report (optional)
npx playwright show-report
```

### **Expected Results**
- ✅ **Isolation Proof** - `window.crossOriginIsolated === true` online + offline
- ✅ **Coach Policy Invariants** - ≤1 hint/sec, ≥4s anti-repeat per hint ID
- ✅ **Privacy & A11y** - No network requests during drills, aria-live regions present

### **If Offline Test Fails**
```bash
# Alternative: Use context.setOffline(true) instead of request routing
# Edit playwright/tests/isolation.spec.ts line ~45:
await page.context().setOffline(true);
await page.reload();
```

---

## 2) Semi-Manual Checks (15 min)

### **A) Device-Flip Resilience (USB ↔ BT) - 8 min**

#### **Setup**
1. Navigate to `/labs/diagnostics?coachhud=1&debug=1`
2. Start audio session with **EC/NS/AGC disabled**
3. Note initial device settings in diagnostics

#### **Test Steps**
1. **Switch from USB mic to BT headset** (often changes to 16kHz)
2. **Expected behavior:**
   - App detects device change
   - Re-creates AudioContext + worklets
   - Continues cleanly without manual reload
3. **Let run for 10 minutes** - check for:
   - 128-frame cadence ticks with 0 drops
   - No audio glitches or lockups
   - Sample rate reconciliation

#### **Pass/Fail Criteria**
- ✅ **Pass:** Auto re-init + stable 10-min run
- ❌ **Fail:** Stalls/distortion/manual reload required

#### **Evidence Collection**
```javascript
// In DevTools Console:
console.log('Device change count:', deviceChangeCount);
console.log('Current settings:', navigator.mediaDevices.getUserMedia({audio: true})
  .then(stream => {
    const settings = stream.getAudioTracks()[0].getSettings();
    console.log('Device settings:', settings);
    stream.getTracks().forEach(track => track.stop());
  }));
```

### **B) Prosody Anti-Gaming & Fairness - 7 min**

#### **Setup**
1. Navigate to `/labs/prosody?mock=question&debug=1`
2. Open DevTools Console
3. Check current thresholds: `console.log(window.__prosodyThresholds)`

#### **Test Steps**
1. **Perform cartoon swoops** (exaggerated pitch swings)
   - Expected: Rejected by slope caps and thresholds
2. **Perform gentle rises** (natural intonation)
   - Expected: Accepted and rewarded
3. **Check threshold scaling:**
   - Thresholds should adapt to recent pitch in-band%
   - Copy should emphasize "gentle rise"

#### **Pass/Fail Criteria**
- ✅ **Pass:** Exaggerated contours rejected, natural ones accepted, thresholds adapt
- ❌ **Fail:** Gaming possible, thresholds don't scale, copy encourages dramatic gestures

#### **Evidence Collection**
```javascript
// In DevTools Console:
console.log('Current thresholds:', window.__prosodyThresholds);
console.log('Threshold scaling test:', window.__prosodyGetCurrentValues?.());
```

---

## 3) Loudness Guard Calibration (5 min)

### **Test Setup**
1. Navigate to `/labs/diagnostics?coachhud=1&debug=1`
2. Start audio session
3. Test at **near and far distances**

### **Test Steps**
1. **Speak comfortably at normal distance**
   - Guard should NOT trip (false positive)
2. **Speak loudly for 5+ seconds**
   - Guard should trip at ≥0.8 normalized loudness
3. **Check Orb shimmer behavior:**
   - Should NOT rise with pure loudness
   - Should be clamped above safety threshold
   - Should tie to session-over-session expressiveness Δ

### **Pass/Fail Criteria**
- ✅ **Pass:** Guard only trips when truly too loud, shimmer clamped
- ❌ **Fail:** False positives, shimmer encourages loudness

### **Evidence Collection**
```javascript
// In DevTools Console:
console.log('Loudness readings:', window.__loudnessReadings);
console.log('Max loudness:', window.__maxLoudness);
console.log('Guard threshold:', 0.8);
```

---

## 4) Fill QA Snapshot (5 min)

### **Use QA_SNAPSHOT_TEMPLATE.md**
1. **Record pass/fail** for all six proofs
2. **Paste screenshots** from console/Network tabs
3. **Dump debug data:**
   ```javascript
   // Copy these to snapshot:
   console.log('Coach emissions:', window.__coachEmits);
   console.log('Prosody thresholds:', window.__prosodyThresholds);
   console.log('QA data export:', window.exportQAData?.());
   ```
4. **Assign owners/dates** for any fixes needed

### **Release Decision Matrix**
- **🟢 Green (6/6):** Ship controlled beta cohort (Firefox/Windows)
- **🟡 Yellow (4-5/6):** Fix blockers, broader desktop testing
- **🔴 Red (<4/6):** Not ready, address isolation/device-flip first

---

## 5) Optional Polish (5 min)

### **CI Integration**
Add this to your GitHub Actions workflow for PR comments:

```yaml
- name: Summarize results in PR
  if: always()
  uses: actions/github-script@v7
  with:
    script: |
      const runUrl = process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY + '/actions/runs/' + process.env.GITHUB_RUN_ID;
      const body = [
        '### QA Smokes (Firefox)',
        `- Result: **${{ job.status }}**`,
        `- Report: [Playwright HTML Report](${runUrl})`,
        '',
        '| Proof | Status |',
        '|---|---|',
        '| Isolation (online/offline) | see report |',
        '| Coach policy invariants | see report |',
        '| Privacy & a11y | see report |',
        '| Device‑flip resilience | manual evidence |',
        '| Prosody fairness | manual evidence |',
        '| Loudness guard | manual evidence |'
      ].join('\n');
      if (context.payload.pull_request) {
        await github.rest.issues.createComment({
          ...context.repo,
          issue_number: context.payload.pull_request.number,
          body
        });
      }
```

### **PR Template**
Require QA snapshot in every release PR:
```markdown
## QA Validation
- [ ] QA snapshot completed and attached
- [ ] All 6 proofs validated
- [ ] Release posture determined (Green/Yellow/Red)
```

---

## 6) Troubleshooting

### **Common Issues**

#### **Isolation Test Fails**
```bash
# Check headers in DevTools Network tab
# Look for COOP: same-origin and COEP: require-corp
# If missing, verify next.config.js headers configuration
```

#### **Coach Hooks Missing**
```javascript
// Verify debug mode is active
console.log('URL params:', new URLSearchParams(window.location.search));
// Should show coachhud=1&debug=1
```

#### **Device Change Not Detected**
```javascript
// Check if ondevicechange is working
navigator.mediaDevices.ondevicechange = () => console.log('Device changed!');
```

#### **Prosody Thresholds Not Exposed**
```javascript
// Check if debug mode is active
console.log('Debug mode:', window.location.search.includes('debug=1'));
```

### **Quick Fixes**

#### **Offline Test Alternative**
```typescript
// In playwright/tests/isolation.spec.ts, replace request routing with:
await page.context().setOffline(true);
await page.reload();
await page.waitForLoadState('networkidle');
```

#### **Chrome Comparison**
```bash
# Add Chrome project to playwright.config.ts
npx playwright test --project=chromium
```

---

## 7) Evidence Checklist

### **Screenshots Needed**
- [ ] Console showing `crossOriginIsolated: true`
- [ ] Network tab with COOP/COEP headers
- [ ] Coach Debug HUD showing rate limiting
- [ ] Device change detection logs
- [ ] Prosody threshold values
- [ ] Loudness guard behavior

### **Data Exports**
- [ ] `window.__coachEmits` array
- [ ] `window.__prosodyThresholds` object
- [ ] `window.exportQAData()` output
- [ ] Playwright test results JSON

### **QA Snapshot Completion**
- [ ] All 6 proofs marked pass/fail
- [ ] Evidence screenshots attached
- [ ] Debug data pasted
- [ ] Blocking issues identified
- [ ] Release recommendation made

---

## 8) Success Criteria

### **Ready for Release (Green)**
- ✅ All 6 proofs pass
- ✅ No blocking issues
- ✅ Evidence collected and documented
- ✅ Stakeholder approval obtained

### **Needs Work (Yellow/Red)**
- ⚠️ 4-5 proofs pass - address blockers
- ❌ <4 proofs pass - major issues, not ready

---

**Total Time:** 30-45 minutes  
**Team Size:** 1-2 people  
**Output:** Decision-grade QA snapshot for stakeholders

---

**Generated by:** Resonai QA Package v1.0  
**Template:** RUN_AND_VERIFY_GUIDE.md

