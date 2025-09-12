# M2: Ready-to-paste GitHub issues

## 1) feat(audio): Complete LPC worklet + F1/F2 estimation & buckets

**Goal:** Real-time resonance hints via coarse F1/F2.

**Tasks**

- Implement `public/worklets/lpc-processor.js`:
  - Pre-emphasis (0.95), window 25 ms, hop 10–15 ms.
  - LPC order 10–12; stabilize via levinson-durbin; formants from roots (real Hz).
  - Reject frames with low energy or implausible F1/F2 (e.g., F1 < 200 or > 1200; F2 < 800 or > 3500).
- In `src/engine/audio/mic.ts`:
  - Merge `{ f1, f2, fFormantsConf }` into telemetry with EMA smoothing.
  - Map to buckets: `brightness = low | med | high` (thresholds in `constants.ts`).
- Expose simple `getResonanceBucket(f1,f2)` util.

**Acceptance**

- `/listen` science mode shows live F1/F2 numbers (coarse) updating at ~30–60 fps.
- Saying /i/ (“ee”) yields higher F2 than /a/ (“ah”) consistently.
- Telemetry never crashes when unvoiced; bucket may be `null` then.

**Files**
`public/worklets/lpc-processor.js`, `src/engine/audio/mic.ts`, `src/lib/constants.ts`, `src/lib/resonance.ts`

---

## 2) feat(ui): Pitch Band drill with in-band% + lateral deviation

**Goal:** First “real” target drill.

**Tasks**

- New drill component `PitchBandDrill.tsx`:
  - Props: `targetBandHz:[number,number]`.
  - Compute `% time in band` over rolling 10 s; show as soft meter (no grades).
  - Lateral offset = semitone deviation from band center; clamp ± 2–3 st.
  - Narrow band by 10–15 cents if `% in band > 70%` for last 20 s; widen if `< 30%`.
- Add to `/practice` FSM: `TARGET` after `WARMUP` (120 s default, skip after 30 s).

**Acceptance**

- Holding a sustained vowel inside the band brightens lane; `% in band` rises.
- Consistent on-target phonation narrows band slightly; detuned speech widens it, never punishing.

**Files**
`src/app/practice/page.tsx`, `src/components/drills/PitchBandDrill.tsx`, `src/components/VoiceCanvas.tsx`, `src/lib/constants.ts`

---

## 3) feat(ui): Prosody mini-phrases + expressiveness meter

**Goal:** Train intonation without numbers.

**Tasks**

- Create `ProsodyDrill.tsx` with three prompts (localizable):
  - “Question lilt?”, “Friendly hello”, “Excited update”.
- For each utterance, compute F0 contour; metric = stdev of F0 within phrase + end-rise detection for questions.
- Visual: ribbon-like thread trails; show “Your phrasing danced more” when variance exceeds personal baseline.

**Acceptance**

- Question prompt reliably shows final-syllable rise vs. statement baseline.
- Expressiveness meter increases on varied contours; never nags.

**Files**
`src/components/drills/ProsodyDrill.tsx`, `src/app/practice/page.tsx`, `src/lib/prosody.ts`

---

## 4) feat(reflect): Orb v2 (resonance hue + tilt shimmer) + trend chips

**Goal:** Make reflections feel like living art + show gentle progress.

**Tasks**

- Orb renderer uses:
  - **Hue** from F2 bucket (low→violet, med→gold, high→pink).
  - **Saturation** from F1 openness.
  - **Shimmer density** from HF/LF tilt.
- Save small PNG/SVG dataURL in session.
- Add 3 trend chips on reflection: `medianF0`, `% in band`, `brightness` (last 3 sessions, arrows up/down).

**Acceptance**

- After a session, orb colors match vowel choice tendencies (/i/ warmer than /a/).
- Trend chips appear with arrows; no raw scores unless science mode enabled.

**Files**
`src/components/SessionOrb.tsx`, `src/app/practice/page.tsx`, `src/lib/trends.ts`

---

## 5) chore(core): Centralize thresholds & smoothing in `constants.ts`

**Goal:** One place to tune DSP + UX.

**Tasks**

- Add:
  - `SILENCE_RMS`, `CLIP_RMS`
  - `F0_SMOOTH_ALPHA`, `TILT_SMOOTH_ALPHA`
  - `LPC_ORDER`, `LPC_WINDOW_MS`, `LPC_HOP_MS`
  - `F1_RANGE`, `F2_RANGE` and bucket thresholds
  - `BAND_TIGHTEN_CENTS`, `BAND_RELAX_CENTS`
- Refactor usages across audio engine and drills.

**Acceptance**

- Changing a constant updates behavior app-wide with no hunt-and-peck edits.

**Files**
`src/lib/constants.ts`, touch refs across `mic.ts`, drills, canvas

---

## 6) feat(labs): Add `/labs/pitch` and `/labs/lpc` harness pages

**Goal:** Fast empirical tuning on real mics.

**Tasks**

- `/labs/pitch`: show raw F0 Hz, confidence, jitter proxy, CPU usage.
- `/labs/lpc`: show F1/F2 text + tiny live scatter; buttons for vowel prompts (/i,e,a,o,u/).
- Both pages respect science toggle and read constants.

**Acceptance**

- On `/labs/lpc`, /i/ cluster visibly higher F2 than /a/ across 5-10 tokens.
- CPU stays reasonable (<25% on typical laptop).

**Files**
`src/app/labs/pitch/page.tsx`, `src/app/labs/lpc/page.tsx`

---

## 7) docs: Tuning guide + QA checklist

**Goal:** Make iterative tuning easy.

**Tasks**

- Add `docs/tuning.md` with:
  - How to measure latency, CPU.
  - How to adjust silence/clip thresholds, smoothing, bands.
  - Browser quirks (Firefox worklet permissions).
- Add `docs/qa-checklist.md` (latency, silence pause, clip hint, band drill, prosody rise, orb coloration).

**Acceptance**

- New contributors can tune thresholds and validate drills within 10 minutes.

**Files**
`docs/tuning.md`, `docs/qa-checklist.md`, link from README

---

## 8) feat(safety): Strain guardrails + lower-intensity mode

**Goal:** Protect users from overexertion.

**Tasks**

- Detect potential strain: rising RMS + rising jitter proxy over 3–5 s → show rest prompt and auto-insert 20 s **REST** state.
- Global **Lower Intensity** toggle halves durations, widens bands, and reduces target expressiveness thresholds.

**Acceptance**

- For deliberately pressed phonation, app offers rest within ~5 s and recovers gracefully.
- Toggling Lower Intensity immediately shortens current/next drill timers and widens pitch band.

**Files**
`src/app/practice/page.tsx` (FSM), `src/lib/safety.ts`, `src/lib/constants.ts`
