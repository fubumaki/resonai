# ✅ Resonai QA Checklist — M2

This document defines the test plan for M2 features (#7–14).  
Run at least one full pass per target device (Win/Mac desktop, Android mid-range).  

---

## 0) Pre-flight
- [ ] App builds with `pnpm build` and runs on HTTPS.
- [ ] Mic permission only requested on `/listen` and `/practice`.
- [ ] Clear local data → onboarding flow appears.

---

## 1) Warmup & Safety Baseline
- [ ] Warmup runs 120s (60s in Lower Intensity mode).
- [ ] Silence >5s → auto-pause; resume on voice.
- [ ] Clipping → “lower input” hint shows.
- [ ] Reflection saves orb + sliders; session appears in history.

---

## 2) #7 LPC + Resonance Buckets
- [ ] /labs/lpc displays stable F1/F2 or bucket labels.
- [ ] /i/ vs /a/ distinguishable (F2 higher for /i/).
- [ ] Confidence gating prevents flicker.
- [ ] Unvoiced frames handled (no NaN or crashes).

---

## 3) #8 Pitch Band Drill
- [ ] In-band % rises when holding target.
- [ ] Band tightens on success; relaxes on misses.
- [ ] Lane glow latency <120ms perceived.
- [ ] Visuals smooth on desktop + Android.

---

## 4) #9 Prosody Mini-Phrases
- [ ] Statement vs Question detected (end-rise).
- [ ] Expressiveness meter rises with greater variability.
- [ ] No false positives with monotone speech.

---

## 5) #10 Orb v2 + Trend Chips
- [ ] Orb hue reflects resonance tendency.
- [ ] Three sessions → trend chips show arrows.
- [ ] IndexedDB persists trends across reloads.

---

## 6) #11 Centralized Constants
- [ ] `constants.ts` exists and is imported.
- [ ] Editing a constant propagates globally without regressions.

---

## 7) #12 Labs Pages
- [ ] /labs/pitch shows F0 Hz + sparkline.
- [ ] Breathiness test → outliers smoothed.
- [ ] Both /labs pages show build hash/version.

---

## 8) #13 Docs
- [ ] `docs/tuning.md` lists DSP defaults + device notes.
- [ ] `docs/qa-checklist.md` (this file) up to date.

---

## 9) #14 Safety: Strain Guardrails
- [ ] Strain flag triggers with loud/tense phonation.
- [ ] Cooldown auto-inserts after flag.
- [ ] Global Lower Intensity reduces durations/targets.

---

## 10) Performance
- [ ] Latency <120ms (speech→visual).
- [ ] FPS ≥45 sustained on mid-range laptop.
- [ ] CPU <25% typical load.

---

## 11) Accessibility
- [ ] Full keyboard navigation with focus states.
- [ ] Screen reader labels present and accurate.
- [ ] Focus mode shows single cue view.
- [ ] Contrast ratios meet WCAG 2.2 AA.

---

## 12) Privacy
- [ ] No network calls during practice.
- [ ] All data stored in IndexedDB only.
- [ ] “Delete All Data” clears history.
- [ ] No deadnames or sensitive terms in UI.

---

## 13) Regression Smoke
- [ ] /listen live mirror + science toggle stable with null F1/F2.
- [ ] No repeated mic prompts between routes.
- [ ] Long null-F0 spans don’t crash UI.

---

## 14) Cohort Mini-Run
- [ ] 5–10 users complete two sessions each.
- [ ] Median time-in-target improves ≥20% by session 2.
- [ ] <1% users hit strain flags twice consecutively.
- [ ] Cooldown reduces next-day flags ~50%.
- [ ] Survey: SUS ≥80; 90% can state one actionable takeaway.

---
