# PR Title
<!-- e.g., feat(audio): implement LPC worklet (F1/F2) with confidence + smoothing -->

## Summary
<!-- What changed and why -->

## Linked Issues
<!-- e.g., Closes #7, #12 -->

## Acceptance Criteria (tick all that apply)
- [ ] Build passes (lint, typecheck, CI).
- [ ] Feature behavior matches `docs/m2-issues.md`.
- [ ] No regressions on `/listen` and `/practice`.
- [ ] Privacy: no network calls during practice.
- [ ] Safety: warmup/cooldown present; strain guardrails intact.

## Perf Snapshot (paste from PerfOverlay)
**Desktop (mid‑range):**
- FPS avg / p95:
- Worklet→UI latency p95 (ms):
- CPU approx (%):

**Android (mid‑range):**
- FPS avg / p95:
- Worklet→UI latency p95 (ms):
- Notes:

## Evidence
- [ ] Screenshots of **/labs/pitch** and **/labs/lpc** (with build SHA).
- [ ] 30‑sec screen capture of **Pitch Band** drill behavior.
- [ ] Telemetry export attached (JSON) or link.

## QA Links
- Step 0–5 Summary: `docs/m2-step0-5-summary-template.md` (filled)  
- QA checklist: `docs/qa-checklist.md`

## Accessibility
- [ ] Keyboard navigation & visible focus states.
- [ ] SR labels on controls (labs + drills).
- [ ] Focus mode works.

## Notes / Risk
<!-- Any trade‑offs, flagged TODOs, device quirks -->
