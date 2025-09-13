# Ship-gate SLOs & Budgets

## Performance Targets

### Latency (Visual)
- **Target**: ≤ **100 ms** end‑to‑end update while speaking
- **Measurement**: From audio input to UI feedback display
- **Acceptance**: 95th percentile < 100ms during continuous speech

### Pitch Lock-in
- **Target**: Median **< 50 ms** mid‑range (A3-A4); **< 100 ms** low voices (A2)
- **Measurement**: Time from stable pitch input to accurate detection
- **Acceptance**: 90th percentile meets targets

### Accuracy (Held Tones)
- **Target**: **GPE < 5%**; octave flips ~0% after smoothing
- **Measurement**: Gross Pitch Error on sustained tones
- **Acceptance**: < 5% error rate on held vowels

### Stability
- **Target**: **12 min** continuous capture at **48 kHz**, 128‑frame quantum, no underruns
- **Measurement**: Continuous audio processing without dropouts
- **Acceptance**: Zero underruns during 12-minute session

## Technical Requirements

### Isolation
- **Target**: `crossOriginIsolated = true` **online & offline** (SW preserves headers)
- **Measurement**: Dev Status page verification
- **Acceptance**: 100% isolation rate, SW header preservation

### Privacy
- **Target**: No audio or metrics leave device; **IDB** only; **Export/Delete** fully offline
- **Measurement**: Network traffic monitoring, local storage verification
- **Acceptance**: Zero network requests for audio data

## Known Risks & Mitigations

### SW drops headers offline → isolation false
- **Risk**: Service Worker fails to preserve COOP/COEP headers
- **Mitigation**: SW injects **COOP/COEP** on cached navigations; CI header test
- **Detection**: `/dev/status` shows isolation false when offline

### ONNX/threads unavailable
- **Risk**: CREPE-tiny model or WASM threads fail to load
- **Mitigation**: Isolation guard + **YIN fallback**; banner explains reduced performance
- **Detection**: Environment report shows model/threads status

### Device switch (USB/BT) → sample‑rate mismatch
- **Risk**: Audio device change causes sample rate conflicts
- **Mitigation**: `ondevicechange` + toast; **re‑init graph** at new rate
- **Detection**: Audio context sample rate mismatch

### Windows "audio enhancements" deform capture
- **Risk**: OS audio processing interferes with clean signal
- **Mitigation**: Onboarding guidance to **disable enhancements**; headset guidance
- **Detection**: Mic constraint verification in environment report

## Go/No-Go Criteria

**GO** if all criteria met:
- ✅ Cross-origin isolation: online & offline
- ✅ Mic constraints: EC/NS/AGC OFF
- ✅ Pitch quality: <5% octave error, <50ms lock-in
- ✅ Stability: 12min continuous, no underruns
- ✅ Privacy: local-first, no audio uploads
- ✅ Performance: <100ms visual latency

**NO-GO** if any critical criteria fail:
- ❌ Isolation broken (affects CREPE performance)
- ❌ Mic constraints enabled (signal degradation)
- ❌ High octave error (>10%) or slow lock-in (>200ms)
- ❌ Audio dropouts or underruns
- ❌ Privacy violations (audio leaving device)

## Monitoring & Alerting

### Automated Checks
- CI/CD: Headers, Flow JSON schema, isolation tests
- E2E: Cross-origin status, device constraints, flow completion
- Self-test: Pitch accuracy, lock-in time, GPE measurement

### Manual Validation
- Environment report: `/dev/env` for system status
- Dev status: `/dev/status` for isolation verification
- Self-test: `/dev/selftest` for pitch engine validation

### Performance Budgets
- **Bundle size**: <200KB first load JS
- **Memory usage**: <50MB during 12min session
- **CPU usage**: <30% on mid-range hardware
- **Battery impact**: <5% drain per hour on mobile devices

---

**Last Updated**: $(date)
**Target Platform**: Windows 11 + Firefox
**Version**: v1.1.0
