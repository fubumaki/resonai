## Cursor Prompt — “M2 Kickoff: Labs, LPC, Pitch Band (iterate fast)”

**You are Cursor, working in the `resonai` repo (Next.js + WebAudio).**
Implement the following in small, buildable steps with atomic commits and short PRs. Follow acceptance criteria at the end of each step. Keep all audio and data **local‑first**. Use TypeScript where possible.

### Context (do not change)

* M1 shipped: `/listen` live mirror, `/practice` warmup → reflection + orbs, IndexedDB session storage, audio worklets for **pitch** and **energy**, **LPC stub** exists, safety hints.
* Our telemetry type (target):

```ts
type Telemetry = {
  t: number;           // ms since start
  f0Hz: number | null; // fundamental frequency
  f0Conf: number;      // 0..1
  f1: number | null;   // coarse formant
  f2: number | null;   // coarse formant
  rms: number;         // loudness proxy
  hfLf: number;        // spectral tilt proxy
  clipped: boolean;
}
```
* We will build **/labs** pages first to validate DSP + performance before doing more UI polish.

---

## Step 0 — Create centralized constants + types

**Add**

* `src/engine/audio/constants.ts`
* `src/types/telemetry.ts` (export the `Telemetry` type above)
* Ensure all modules import from these rather than duplicating literals.

**Starter defaults** (edit if existing; otherwise create):

```ts
// src/engine/audio/constants.ts
export const SILENCE_RMS = 0.02;
export const CLIP_RMS = 0.30;

export const F0_SMOOTH_ALPHA = 0.25;
export const TILT_SMOOTH_ALPHA = 0.20;

export const LPC_ORDER = 10;
export const LPC_WINDOW_MS = 25;
export const LPC_HOP_MS = 12;

export const F1_RANGE: [number, number] = [250, 1000];
export const F2_RANGE: [number, number] = [900, 3000];

export const BAND_TIGHTEN_CENTS = 15;
export const BAND_RELAX_CENTS   = 25;
```

**Acceptance**

* Build succeeds.
* Existing code compiles using shared constants without regressions.

**Commit**

```
chore(core): add centralized DSP constants and Telemetry type
```

---

## Step 1 — Wire a small bridge for worklet telemetry

**Goal:** Standardize how we consume `pitch-processor`, `energy-processor`, and the LPC worklet.

**Add**

* `src/engine/audio/worklet-bridge.ts`

  * A small class that:

    * loads/registers worklets (idempotent),
    * starts mic stream,
    * multiplexes worklet messages into a single `Telemetry` emitter (EventEmitter or a tiny observable pattern),
    * smooths `f0Hz`/`hfLf` with EMA (use constants),
    * guards null/unvoiced frames and sets `clipped`.

**Implementation notes**

* Keep allocations minimal inside the audio callback.
* Post UI updates on `requestAnimationFrame`.

**Acceptance**

* `/listen` still works.
* No console errors; telemetry object carries `f0Hz | null`, `rms`, `hfLf`; `f1/f2` remain `null` until LPC lands.

**Commit**

```
feat(audio): introduce worklet bridge unifying telemetry and smoothing
```

---

## Step 2 — Add lab harness pages for fast iteration

**Goal:** Two lab pages to observe raw signals & verify performance before UI drills.

**Add**

* `src/app/labs/pitch/page.tsx`
* `src/app/labs/lpc/page.tsx`

**/labs/pitch UI**

* Show: current `f0Hz` (rounded), confidence, sparkline canvas (last ~5s), RMS bar, tilt bar.
* A small info footer showing **build hash/version** (pull from env or `process.env.VERCEL_GIT_COMMIT_SHA` fallback to `Date.now()`).

**/labs/lpc UI**

* Same header scaffolding.
* Two readouts for **F1** and **F2** (or “—” if null).
* A simple **vowel map widget**: draw two labeled horizontal bands (F1 range) and vertical for F2; plot current dot if `f1/f2` present; otherwise grey.
* A “confidence gate” toggle that hides low‑confidence frames (will be wired after LPC outputs `conf`).

**Acceptance**

* Both pages render at ~60fps on desktop, no crashes on nulls.
* No network calls in Network tab during practice.

**Commit**

```
feat(labs): add /labs/pitch and /labs/lpc harness pages with build stamp
```

---

## Step 3 — Complete the LPC AudioWorklet

**Files**

* `public/worklets/lpc-processor.js` (currently a stub) → implement.
* If needed, add `src/engine/audio/lpc.ts` for helper math (Levinson–Durbin) compiled via esbuild to be imported by the worklet.

**Algorithm (coarse, real‑time)**

* AudioWorkletProcessor with a ring buffer of frames.
* Per hop (`LPC_HOP_MS`):

  * Window `N = round(sampleRate * LPC_WINDOW_MS / 1000)` with Hamming; pre‑emphasis 0.95.
  * Autocorrelation → LPC (order = `LPC_ORDER`) using Levinson–Durbin.
  * Find roots of LPC polynomial; take those with positive imag; convert to Hz; sort ascending.
  * Pick coarse `F1`/`F2` within `F1_RANGE`/`F2_RANGE`. If outside ranges or unstable, emit `null`.
  * Compute a simple **confidence**: ratio of formant peak sharpness or stability across last 3 hops.
* PostMessage payload: `{ f1, f2, conf }` (numbers or null, `conf` 0..1).

**Bridge update**

* Merge `{f1,f2,conf}` into `Telemetry`.
* Add basic EMA smoothing for `f1/f2` only when `conf` ≥ 0.5.

**Acceptance**

* On `/labs/lpc`, sustained **/i/** shows higher F2 than **/a/** most of the time in a quiet room.
* Unvoiced frames do not produce flicker or NaN.
* CPU on mid‑range laptop stays <25% with both lab pages open.

**Commit**

```
feat(audio): implement LPC worklet (F1/F2) with confidence + smoothing
```

---

## Step 4 — Minimal Pitch Band drill (gated, testable)

**Goal:** An MVP drill to compute `% time in band` and demonstrate tighten/relax logic; we will refine UI later.

**Add**

* `src/components/PitchBandDrill.tsx`
* Wire into `/practice` FSM after warmup (add a simple “Pitch Band” card).

**Behavior**

* Target band: start with user’s baseline (`median of last 2s voiced frames`) ± 150 cents.
* While sustaining a vowel:

  * Compute instantaneous semitone deviation from band center.
  * Glow “in‑band” when inside; accumulate duration to `% in band`.
* Adaptation:

  * After each 10s block: if `% in band ≥ 70%`, **narrow** band by `BAND_TIGHTEN_CENTS`; if `< 40%`, **relax** by `BAND_RELAX_CENTS`.
  * Never narrow below 40 cents total width; never relax above 500 cents.

**UI**

* Simple lane with band background and a moving dot (current f0).
* Show `% in band` and current band width (cents).

**Acceptance**

* `% in band` moves sensibly with user behavior.
* Band tightens after success, relaxes after misses; no “thrashing” (i.e., avoid immediate oscillation—debounce changes to every 10s).
* Visual latency perceived <~120ms.

**Commit**

```
feat(ui): add minimal Pitch Band drill with in-band% and adaptive width
```

---

## Step 5 — Docs + QA hooks

**Add**

* `docs/tuning.md` (LPC window/hop, order, pre‑emphasis, device quirks; how to test /labs pages).
* Confirm `docs/qa-checklist.md` links to `/labs/pitch` and `/labs/lpc` for quick DSP validation.

**Commit**

```
docs: add tuning guide and update QA checklist with labs references
```

---

## Implementation Notes & Guardrails

* **Accessibility:** ensure buttons/controls have labels; keyboard focus visible on lab pages.
* **Safety:** keep warmup available; never encourage pushing volume; show clipping hint when `rms > CLIP_RMS`.
* **Privacy:** no uploads; verify Network tab is quiet during practice.
* **Performance:** prefer Float32 arrays reused across hops; keep GC minimal in worklet.
* **Fallbacks:** if LPC crashes on a platform, catch and continue without F1/F2 (UI should degrade gracefully).

---

## Quick Commands

* `pnpm i`
* `pnpm dev` (local HTTPS if required for mic; Vercel preview is fine)
* `pnpm build`

---

## Validation Checklist (for you to auto‑run after each step)

* Build passes, no console errors.
* `/labs/pitch` updates at ~60fps; `/labs/lpc` shows F1/F2 or hides dot when confidence low.
* CPU <25% on mid‑range laptop; perceived latency <120ms.
* Pitch Band `% in band` behaves intuitively; adaptation debounced.

---

## PR Titles (use these)

1. `chore(core): add centralized DSP constants and Telemetry type`
2. `feat(audio): introduce worklet bridge unifying telemetry and smoothing`
3. `feat(labs): add /labs/pitch and /labs/lpc harness pages with build stamp`
4. `feat(audio): implement LPC worklet (F1/F2) with confidence + smoothing`
5. `feat(ui): add minimal Pitch Band drill with in-band% and adaptive width`
6. `docs: add tuning guide and update QA checklist with labs references`

---

**When done with Steps 0–5:** post a short summary with (a) desktop + Android performance numbers, (b) screenshots of `/labs` pages, and (c) a 30‑second screen capture of the Pitch Band drill behavior. Then we’ll iterate constants and smoothing before starting Prosody and Orb v2.
