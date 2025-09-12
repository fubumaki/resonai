## Cursor Prompt — “Iteration Harness & Guardrails (post Step 0–5)”

**You are Cursor, working in the `resonai` repo (Next.js + WebAudio).**
Build small, atomic PRs with the acceptance criteria below. Keep everything local‑first. Prefer TypeScript.

### Scope (fast wins we can do right now)

- **A. Labs Controls Panel:** Live‑tune LPC + smoothing constants in the browser (persisted to `localStorage`), sent to the worklet via `postMessage`.
- **B. Perf/Latency Overlay:** On /labs pages, show FPS, RAF frame p95, and “worklet→UI” latency estimate (ms).
- **C. Telemetry Recorder:** One‑click record last 30 s of telemetry to downloadable JSON (for bug reports & tuning).
- **D. Minimal CI:** Lint + typecheck + build + Playwright smoke on /labs pages in Node 20 with pnpm.
- **E. Prosody Spike (end‑rise yes/no):** A simple, tunable slope detector we can iterate on before the full drill.

---

### A) Labs Controls Panel (runtime tweaks)

Files

- `src/app/labs/_components/ControlsPanel.tsx` (new)
- Extend `public/worklets/lpc-processor.js` to accept config updates
- `src/engine/audio/worklet-bridge.ts` → add `sendConfig(type, payload)` helper

UI

- Sliders / inputs:
  - `LPC_ORDER` (8–14)
  - `LPC_WINDOW_MS` (20–30), `LPC_HOP_MS` (8–15)
  - `preEmphasis` (0.90–0.98)
  - `confGate` (0.0–1.0)
  - `F1_RANGE`, `F2_RANGE` (two-number inputs)
  - Smoothing: `F0_SMOOTH_ALPHA`, `TILT_SMOOTH_ALPHA`
- Buttons: Reset to defaults, Persist overrides (toggle)

Worklet protocol

```ts
type LpcConfigMsg = {
  type: 'lpc:updateConfig',
  payload: {
    order?: number; windowMs?: number; hopMs?: number; preEmphasis?: number;
    f1Range?: [number, number]; f2Range?: [number, number]; confGate?: number;
  }
}
```

- In the worklet, handle `port.onmessage` to update config atomically between hops.

Acceptance

- Changing controls updates /labs/lpc output immediately (within one hop).
- Overrides survive reload when “Persist” is on; otherwise revert to defaults.

Commit

```
feat(labs): add runtime ControlsPanel with persisted DSP overrides; wire worklet config updates
```

---

### B) Perf & Latency Overlay

Files

- `src/app/labs/_components/PerfOverlay.tsx` (new)
- `src/engine/metrics/perf.ts` (helper)

What to measure (display in a small fixed badge)

- FPS (avg) and frame p95 over last 10 s (from `requestAnimationFrame` deltas).
- Worklet→UI latency (ms): when a Telemetry frame arrives, record `performance.now()` and subtract embedded `t` (ms since start) set in the worklet when it posts the message. Show avg/p95 for last 10 s.
- Dropped frame ratio (optional): count frames where RAF delta > 32 ms.

Acceptance

- Overlay toggled on `/labs/pitch` and `/labs/lpc` (hidden by default).
- On mid‑range laptop, shows FPS ≥ 45 and worklet→UI p95 < 120 ms when speaking normally.

Commit

```
feat(labs): add PerfOverlay with FPS, p95 frame time, and worklet→UI latency
```

---

### C) Telemetry Recorder (30 s JSON)

Files

- `src/app/labs/_components/Recorder.tsx` (new)

Behavior

- Circular buffer of last N telemetry frames (~30 s @ ~60 fps UI updates → store ~1800 samples).
- Button “Save telemetry.json” → downloads the buffer as JSON with `{buildSha, deviceHints, samples: Telemetry[]}`.
- Include a “mark” button to insert timestamped notes (helps correlate with user actions).

Acceptance

- Downloaded file imports back cleanly (`JSON.parse`) and aligns with visible graphs.
- Zero network calls triggered by recording/saving.

Commit

```
feat(labs): add 30s Telemetry Recorder with notes and JSON export
```

---

### D) Minimal CI (lint, type, build, labs smoke)

Files

- `.github/workflows/ci.yml` (new)
- `tests/labs.spec.ts` (Playwright)

ci.yml (Node 20 + pnpm)

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm i --frozen-lockfile
      - run: pnpm run lint
      - run: pnpm run typecheck
      - run: pnpm run build
      - run: pnpm exec playwright install --with-deps
      - run: pnpm test:e2e
```

tests/labs.spec.ts (headless smoke)

- Launch dev server or use Next’s `next start` in CI.
- Navigate to `/labs/pitch` and `/labs/lpc`.
- Assert core elements render, no console errors, and Telemetry numbers appear within 3 s when mic is unavailable (fallback UI text visible).

Acceptance

- CI passes on PR (lint/type/build/tests green).
- Failing /labs rendering or console errors will block merge.

Commit

```
chore(ci): add GitHub Actions with lint/type/build and Playwright labs smoke
test(e2e): labs pages render without mic; no console errors
```

---

### E) Prosody Spike (end‑rise detector v0)

Files

- `src/engine/audio/prosody.ts` (new)
- `src/app/labs/pitch/page.tsx` → temporary prosody indicator strip

Algorithm (simple, tunable)

- Maintain a rolling window of voiced frames (e.g., last 1200 ms).
- Convert `f0Hz` to cents relative to window median, smooth with EMA.
- Compute slope over the last 350 ms (linear fit; ignore nulls).
- Decision:
  - rise if slope ≥ RISE_CENTS_PER_SEC (e.g., 250 cents/s) and at least 300 ms of voiced frames present.
  - fall if slope ≤ −250 cents/s.
  - else flat.
- Export constants:

```ts
export const RISE_CENTS_PER_SEC = 250;
export const FALL_CENTS_PER_SEC = -250;
export const MIN_VOICED_MS = 300;
```

- Visual: a small badge on /labs/pitch showing Rising / Falling / Flat.

Acceptance

- A true rising contour shows Rising most of the time in a quiet room.
- Monotone read shows Flat, not Rising.

Commit

```
feat(prosody): add minimal end-rise detector and labs badge for quick tuning
```

---

## Housekeeping (nice-to-haves if quick)

- `.github/pull_request_template.md` that asks authors to paste the Step 0–5 Summary link and perf numbers (desktop + Android).
- Add build info helper:
  - `NEXT_PUBLIC_BUILD_SHA` (Vercel) and fallback to `Date.now()`; show it on labs footer.

Commit

```
docs(chore): add PR template referencing docs/m2-step0-5-summary-template.md
feat(core): add build info footer for labs pages
```

---

## Validation (what to check before merging)

- Controls Panel updates the LPC worklet without reload; Reset returns to defaults from `constants.ts`.
- PerfOverlay shows FPS ≥45 and worklet→UI p95 <120 ms on a mid‑range laptop when speaking.
- Telemetry Recorder exports JSON that re‑opens cleanly and matches on‑screen behavior.
- CI is green; labs smoke catches basic regressions.
- Prosody badge changes sensibly between statement vs question reads.

---

### After merge

- Use `docs/m2-step0-5-summary-template.md` to capture:
  - perf numbers from PerfOverlay (desktop + Android),
  - screenshots of /labs pages with Controls Panel,
  - a 30 s screen capture of Pitch Band + Prosody badge,
  - any constant tweaks proposed (include before/after values).
