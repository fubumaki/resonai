# M2 QA Test Script (Cursor Runbook)

## 0) Test Matrix (devices & browsers)

Run at least one full pass on each row:

- [ ] Desktop Mid-range (Win/Mac) · Chrome (latest), Edge (latest)
- [ ] Android Mid-range (e.g., Pixel 6 / Samsung A-series) · Chrome (latest)
- [ ] Optional sanity: Firefox (desktop) for worklet quirks

---

## 1) Pre-flight

- [ ] `pnpm i && pnpm build && pnpm start` (or use Vercel preview link)
- [ ] Confirm HTTPS + mic permission prompt appears only on pages that need it
- [ ] Clear local data: DevTools → Application → Clear storage (fresh onboarding)

**Pass when**

- [ ] App boots, no console errors
- [ ] Mic permission requested only on `/listen` and `/practice`

---

## 2) Warmup & Safety Baseline (existing)

- [ ] Go to `/practice` → Start warmup (120s)
- [ ] Speak softly; verify timer, auto-pause on >5s silence; resume on voice
- [ ] Force clipping (move mic close) → see “lower input” hint
- [ ] Toggle Lower Intensity (60s) and complete
- [ ] Complete Reflection (comfort/fatigue/euphoria) → orb saved to history

**Expected**

- [ ] No crashes with null F0
- [ ] Sessions listed in history
- [ ] Hints fire correctly

---

## 3) Issue #7 — LPC + F1/F2 Resonance Buckets

Setup: Ensure LPC worklet is active (build includes `lpc-processor`).

- [ ] Open `/labs/lpc`
- [ ] Sustain `/i/` (as in “beet”) 3× for ~2s each, then `/a/` (as in “father”) 3×
- [ ] Note displayed f1,f2 (or bucket labels) + any confidence value
- [ ] Background noise test: fan on / window open → repeat /i/ and /a/
- [ ] Mobile test: Android mid-range device, repeat (quiet room)

**Pass when**

- [ ] `/i/` consistently maps to higher F2 bucket than `/a/` and within expected ranges
- [ ] Unvoiced frames don’t explode telemetry (no NaN/undefined; UI remains stable)
- [ ] Confidence gating hides unstable frames (no rapid color flicker)

---

## 4) Issue #8 — Pitch Band Drill (in-band % + adaptive width)

- [ ] Start Pitch Band drill from `/practice`
- [ ] Hold a comfortable vowel inside the band for 3× 2s reps → watch % in-band rise
- [ ] Verify band tightens after sustained success (e.g., +15 cents tighten)
- [ ] Intentionally drift outside band → verify band relaxes after misses
- [ ] Latency check: quick “ah” blip responds in <~120ms perceived

**Pass when**

- [ ] In-band % updates sensibly; tighten/relax rules apply without “thrashing”
- [ ] Visuals stay smooth (no jank) and readable on mobile

---

## 5) Issue #9 — Prosody Mini-Phrases + Expressiveness Meter

- [ ] Select “Statement” prompt (e.g., “I’m ready to go.”) → read flatly
- [ ] Select “Question” version → read with gentle end-rise
- [ ] Repeat with exaggerated vs subtle rises
- [ ] Speak a short story phrase with varied highs/lows

**Pass when**

- [ ] System detects end-rise vs fall correctly most of the time (±50 cents tolerance)
- [ ] Expressiveness meter increases with greater F0 variability
- [ ] No false positives with monotone reads

---

## 6) Issue #10 — Orb v2 + Trend Chips

- [ ] Complete a daily 5–8 min loop (warmup → pitch → resonance → prosody → reflection)
- [ ] Confirm session orb hue reflects resonance tendency (brighter hue after /i,e/ focus)
- [ ] Do two more sessions with different emphases (e.g., /a/ day; prosody day)
- [ ] Open History → verify trend chips show last 3 sessions with arrows

**Pass when**

- [ ] Orb colors/trends align with recent drill focus
- [ ] Trend chips render and persist across reloads (IndexedDB intact)

---

## 7) Issue #11 — Centralized thresholds & smoothing

- [ ] Inspect `constants.ts` is present and imported by audio/visual modules
- [ ] Flip one constant (e.g., `BAND_TIGHTEN_CENTS`) → hot reload
- [ ] Verify behavior shift only where expected (no silent regressions)

**Pass when**

- [ ] All thresholds reference the central constants
- [ ] Modifying a value consistently propagates across features

---

## 8) Issue #12 — Labs Pages (/labs/pitch, /labs/lpc)

- [ ] Visit `/labs/pitch` → stable F0 readout (Hz + confidence/sparkline)
- [ ] Try breathy phonation → outliers smoothed, not spiky
- [ ] Visit `/labs/lpc` → both pages show build hash/version for bug reports

**Pass when**

- [ ] Both lab pages render, update ~60fps, and include a visible build/version stamp

---

## 9) Issue #13 — Docs: Tuning Guide + QA Checklist

- [ ] `docs/tuning.md` includes: window/hop sizes, pre-emphasis defaults; device-specific notes (Firefox quirks); how-to reproduce resonance tests
- [ ] `docs/qa-checklist.md` (this script) present & up to date

**Pass when**

- [ ] Docs are clear, copy-pastable; no TODOs left

---

## 10) Issue #14 — Safety: Strain Guardrails + Global Lower-Intensity

- [ ] In Pitch Band drill, speak louder/tenser for ~10–15s (avoid harm)
- [ ] Watch for strain flag (e.g., SPL proxy + jitter spike)
- [ ] App auto-suggests cooldown (SOVT) and shortens next drill
- [ ] Toggle Global Lower Intensity and repeat a session

**Pass when**

- [ ] Strain flags appear only when warranted; cooldown injects automatically
- [ ] Lower-Intensity reduces durations/targets globally

---

## 11) Performance & Latency

Method

- [ ] Desktop: Chrome DevTools Performance → record during Pitch Band + Prosody
- [ ] Mobile: Observe responsiveness; optional Android Profiler via remote debugging

Pass targets

- [ ] Latency (speech→visual): perceived < 120 ms
- [ ] FPS: UI ≥ 45 fps sustained
- [ ] CPU: < 25% on mid-range laptop during drills

---

## 12) Accessibility & UX

Checks

- [ ] Full keyboard navigation through session player; visible focus states
- [ ] Screen reader labels for controls; announce state changes briefly (no spam)
- [ ] Focus Mode: single-cue view hides non-essential UI

**Pass when**

- [ ] WCAG 2.2 AA basics hold: contrast, labels, keyboard operability

---

## 13) Privacy & Data

Checks

- [ ] No network calls made during practice (verify Network tab)
- [ ] IndexedDB only; entries contain expected fields; Delete All clears history
- [ ] No deadnames or sensitive strings appear anywhere by default

**Pass when**

- [ ] All audio/data local-first; opt-in cloud toggles (if present) are off by default

---

## 14) Regression Smokes

- [ ] `/listen` live mirror works; science toggle safe when F1/F2 null
- [ ] Repeated permissions prompts do not occur across routes
- [ ] App tolerates long stretches of null F0 (whispering/silence) without errors

---

## 15) Cohort Mini-Run (5–10 users)

Protocol

- [ ] Two sessions/user over 72 hours
- [ ] Capture: completion rate, time_in_target, strain_flag rate, qualitative “felt sense”
- [ ] Debrief: 10-minute survey on clarity of cues and comfort

Success criteria

- [ ] Median time_in_target +20% by session 2 (new users)
- [ ] <1% users hit strain flags twice in a row; cooldown reduces next-day flags ~50%

---

## 🗒️ Recording Template (per test)

```
Device/Browser:
Build hash:
Tester:

Feature:
Steps taken:
Result (pass/fail):
Notes (latency, fps, anomalies):
Console/Network logs (if any):
Screenshots/recordings:
```

## 🔧 Failure Triage

- Audio weirdness → reproduce on /labs first; attach raw metrics; note environment (room noise, mic)
- UI jank → record Performance profile; tag with build hash
- Heuristic misses → capture 10–15s WAV (if consented) + telemetry snapshot; link to constants used
