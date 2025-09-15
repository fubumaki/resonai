# Resonai Coach System - QA Playbook
## Decision-Grade Audit Framework

**Target:** `https://resonai.vercel.app` (Commit: `b989831`)  
**Test Environment:** Firefox on Windows 11  
**Feature Flags:** `?coachhud=1&coach=1&debug=1`

---

## 1. Isolation Proof (Firefox, Online & Offline)

### Test Steps:
1. **Online Test:**
   - Open DevTools → Network tab
   - Navigate to `https://resonai.vercel.app`
   - Check console: `console.log('Isolated:', window.crossOriginIsolated)`
   - Verify Network shows: `COOP: same-origin` and `COEP: require-corp` for HTML + workers
   - Test audio: Start a drill, verify worklets load from cache

2. **Offline Test:**
   - Go offline (DevTools → Network → Offline)
   - Refresh page
   - Verify same isolation headers and worklet loading
   - Test audio functionality

### Pass Criteria: ✅
- `window.crossOriginIsolated === true` both online and offline
- All worklet/WASM/ONNX requests succeed from cache
- Network shows proper COOP/COEP headers for HTML + workers
- Audio processing works in both states

### Fail Criteria: ❌
- Isolation drops offline
- Worklets fail to load from cache
- Missing COOP/COEP headers
- Audio processing breaks

### Evidence Screenshots:
- Console showing `crossOriginIsolated: true`
- Network tab showing COOP/COEP headers
- Service Worker cache entries
- Audio worklet loading success

---

## 2. Device-Flip Resilience

### Test Steps:
1. **USB to Bluetooth Switch:**
   - Start audio session with USB mic
   - Switch to Bluetooth headset mid-session
   - Verify automatic detection and re-init
   - Continue for 10 minutes, check for glitches

2. **Unplug/Replug Test:**
   - Unplug USB mic during active session
   - Replug after 30 seconds
   - Verify graceful recovery and re-init

3. **Sample Rate Change:**
   - Check `getSettings().sampleRate` vs `audioCtx.sampleRate`
   - Verify they match after device change

### Pass Criteria: ✅
- Automatic detection of device changes
- AudioContext + worklets re-initialize cleanly
- No glitching/lockups in 10-minute run
- Sample rates reconcile properly
- Gentle user prompt on device change

### Fail Criteria: ❌
- Audio processing stops on device change
- Glitches or lockups occur
- Sample rate mismatches
- No user feedback on device change

### Evidence Screenshots:
- Console logs showing device change detection
- Audio context re-initialization
- Sample rate reconciliation
- 10-minute stability test results

---

## 3. Coach Policy Invariants (1/sec; ≥4s Anti-Repeat)

### Test Steps:
1. **Rate Limiting Test:**
   - Open `/coach-simulator?coachhud=1`
   - Set jitter to 0.5, trigger first hint
   - Try to trigger second hint within 1 second
   - Verify only one hint appears per second

2. **Anti-Repeat Test:**
   - Trigger same hint ID multiple times
   - Verify 4-second cooldown between identical hints
   - Test with different hint IDs (should not block)

3. **Phrase-End Priority Test:**
   - Complete a phrase with high DTW tier
   - Verify praise hint appears (not technique hints)
   - Test priority swap logic

4. **Tab Visibility Test:**
   - Start session, switch tabs
   - Return to tab, continue session
   - Verify rate limiting still works

### Pass Criteria: ✅
- Exactly 1 hint per second maximum
- 4-second cooldown per hint ID
- Phrase-end priority swaps work correctly
- Rate limiting persists through tab changes
- No hint spam or duplicate IDs

### Fail Criteria: ❌
- Multiple hints per second
- Duplicate hint IDs within 4 seconds
- Priority logic fails at phrase end
- Rate limiting breaks on tab change

### Evidence Screenshots:
- Coach Debug HUD showing rate limiting
- Console logs with hint timestamps
- Anti-repeat cooldown verification
- Priority resolution test results

---

## 4. Prosody Fairness & Anti-Gaming

### Test Steps:
1. **Exaggerated Swoops Test:**
   - Try dramatic pitch swings (not gentle rises)
   - Verify system doesn't reward performative behavior
   - Check that gentle rises are preferred

2. **Threshold Scaling Test:**
   - Complete several phrases with different pitch ranges
   - Verify thresholds adapt to user's in-band performance
   - Check that copy says "gentle rise" not "big swoop"

3. **Gaming Resistance Test:**
   - Try to game the system with artificial patterns
   - Verify natural speech patterns are rewarded
   - Check threshold visibility in HUD

### Pass Criteria: ✅
- Exaggerated swoops don't pass validation
- Thresholds scale to user's in-band pitch
- Copy emphasizes "gentle rise"
- Natural speech patterns are rewarded
- Gaming attempts are detected and discouraged

### Fail Criteria: ❌
- Performative behavior is rewarded
- Thresholds don't adapt to user
- Copy encourages dramatic gestures
- System can be easily gamed

### Evidence Screenshots:
- Pitch contour analysis showing gentle vs exaggerated
- Threshold scaling in debug HUD
- Copy text verification
- Gaming attempt detection

---

## 5. Loudness Guard Calibration

### Test Steps:
1. **Distance Consistency Test:**
   - Record same voice at different mic distances
   - Verify consistent loudness behavior
   - Check that guard triggers at appropriate levels

2. **Orb Shimmer Test:**
   - Check that visual feedback doesn't encourage loudness spikes
   - Verify shimmer is clamped above RMS guard
   - Test that visual feedback supports gentle approach

3. **Baseline Normalization Test:**
   - Start new session, establish baseline
   - Verify guard adjusts to user's normal speaking level
   - Check threshold adaptation over time

### Pass Criteria: ✅
- Consistent behavior across mic distances
- Orb shimmer doesn't encourage loudness spikes
- Per-session baseline normalization works
- Visual feedback supports gentle approach
- Guard thresholds adapt to user

### Fail Criteria: ❌
- Inconsistent behavior with distance
- Visual feedback encourages loudness
- No baseline normalization
- Fixed thresholds don't adapt

### Evidence Screenshots:
- Loudness readings at different distances
- Orb shimmer behavior during loudness spikes
- Baseline normalization graphs
- Threshold adaptation over time

---

## 6. Privacy & A11y Visibility

### Test Steps:
1. **Export/Delete Visibility:**
   - Look for clear "Export Data" and "Delete Data" options
   - Verify they're prominent in UI
   - Test that they work correctly

2. **Network Privacy Test:**
   - Monitor network during drills
   - Verify no data leaves device
   - Check that all processing is local

3. **Screen Reader Test:**
   - Use NVDA or similar screen reader
   - Verify feedback is announced via aria-live
   - Check that all controls are labeled

4. **Keyboard Navigation Test:**
   - Complete entire session using only keyboard
   - Verify all functions are accessible
   - Check tab order and focus management

### Pass Criteria: ✅
- Export/Delete options are obvious in UI
- No network requests during drills
- NVDA reads all feedback
- Keyboard completes full sessions
- All controls are properly labeled

### Fail Criteria: ❌
- Privacy controls are hidden
- Network requests occur during drills
- Screen reader can't access feedback
- Keyboard navigation is incomplete
- Controls lack proper labels

### Evidence Screenshots:
- Privacy controls in UI
- Network tab showing no requests
- Screen reader output
- Keyboard navigation test
- Accessibility audit results

---

## Release Posture Decision Matrix

### 🟢 Green (Controlled Beta)
**Criteria:** All 6 proofs pass on Firefox/Windows
- Isolation works online/offline
- Device changes handled gracefully
- Policy invariants hold under stress
- Anti-gaming measures effective
- Loudness guard properly calibrated
- Privacy & a11y fully compliant

### 🟡 Yellow (Broader Desktop)
**Criteria:** 4-5 proofs pass, minor issues
- Chrome timing jitter issues
- Different EC/NS defaults
- Mid-tier Android compatibility
- Resonance tracking needs work

### 🔴 Red (Not Ready)
**Criteria:** <4 proofs pass
- Critical isolation failures
- Device change crashes
- Policy invariants broken
- Privacy violations
- Accessibility barriers

---

## Quick Test Commands

```bash
# Check isolation
console.log('Isolated:', window.crossOriginIsolated)

# Check rate limiting
# Use /coach-simulator?coachhud=1

# Check device detection
navigator.mediaDevices.ondevicechange = () => console.log('Device changed')

# Check privacy
# Monitor Network tab during drills

# Check a11y
# Use screen reader or keyboard navigation
```

---

## Evidence Collection Template

For each proof, collect:
1. **Screenshot** of test setup
2. **Console logs** showing behavior
3. **Network tab** evidence (if applicable)
4. **Pass/Fail** determination
5. **Blocking issues** (if any)
6. **Owner** assignment for fixes

This playbook ensures a comprehensive, decision-grade audit that protects the "mirror, not judge" design principle under real-world conditions.

