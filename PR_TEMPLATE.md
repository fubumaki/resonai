# Pull Request Template

## 📋 QA Validation Checklist

### **Automated Tests**
- [ ] **Isolation Proof** - COOP/COEP headers online/offline
- [ ] **Coach Policy Invariants** - ≤1 hint/sec, ≥4s anti-repeat
- [ ] **Privacy & A11y** - No network requests, screen reader support

### **Manual Tests**
- [ ] **Device-Flip Resilience** - USB↔BT switching test completed
- [ ] **Prosody Fairness** - Anti-gaming validation completed
- [ ] **Loudness Guard** - Distance calibration test completed

### **Evidence Collection**
- [ ] QA snapshot completed and attached
- [ ] Screenshots captured for all proofs
- [ ] Debug data exported (`__coachEmits`, `__prosodyThresholds`)
- [ ] Console logs saved for troubleshooting

### **Release Decision**
- [ ] **Release Posture Determined:**
  - [ ] 🟢 **Green (6/6)** - Ready for controlled beta
  - [ ] 🟡 **Yellow (4-5/6)** - Fix blockers, broader testing
  - [ ] 🔴 **Red (<4/6)** - Not ready, address critical issues

---

## 🧪 QA Snapshot

**Attach completed QA_SNAPSHOT_TEMPLATE.md with:**
- [ ] Pass/fail status for all 6 proofs
- [ ] Evidence screenshots
- [ ] Debug data exports
- [ ] Blocking issues identified
- [ ] Release recommendation

---

## 🔧 Manual Testing Commands

```javascript
// Device change detection
navigator.mediaDevices.ondevicechange = () => console.log('Device changed!');

// Coach debug state
console.log('Coach state:', window.__coachDebugState?.());

// Prosody thresholds
console.log('Thresholds:', window.__prosodyThresholds);

// Export all data
console.log('QA data:', window.exportQAData?.());
```

---

## 📊 Test Results

### **Automated Tests**
- **Firefox:** [View Report](https://github.com/your-repo/actions/runs/xxx)
- **Chrome:** [View Report](https://github.com/your-repo/actions/runs/xxx) (if applicable)

### **Manual Tests**
- **Device-Flip:** [Screenshot/Evidence]
- **Prosody Fairness:** [Screenshot/Evidence]
- **Loudness Guard:** [Screenshot/Evidence]

---

## 🚨 Blocking Issues

| Issue | Severity | Owner | ETA | Notes |
|-------|----------|-------|-----|-------|
| | | | | |
| | | | | |

---

## 📝 Notes

```
[Additional observations, edge cases, or recommendations]
```

---

**QA Package Version:** 1.0.0  
**Testing Environment:** Firefox on Windows 11  
**Target URL:** https://resonai.vercel.app

