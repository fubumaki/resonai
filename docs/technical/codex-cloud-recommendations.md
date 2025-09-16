# Codex-Cloud Follow-up Recommendations

This note consolidates the infrastructure requirements that keep browser isolation, low-latency capture, and pitch analysis stable in production. It is intended to guide Codex-Cloud follow-up PRs by pointing at the current configuration surface, expected tests, and checklist items for upcoming deltas.

## Cross-Origin Isolation

**Current posture**

- `next.config.js` sets the CSP, COOP/COEP, worker-src, and related headers for every route so AudioWorklets and SharedArrayBuffer remain available. 【F:next.config.js†L1-L44】
- `middleware.ts` leaves header handling to Next.js but applies cache busting to `/try` and `/api/events`, keeping pilot flows compatible with isolation. 【F:middleware.ts†L7-L34】
- Playwright "Isolation Proof" specs assert COOP/COEP headers, `window.crossOriginIsolated`, and the absence of COEP/CORP console errors both online and offline. 【F:playwright/tests/isolation.spec.ts†L3-L151】【F:playwright/tests/isolation-offline-fix.spec.ts†L3-L97】

**Follow-up actions**

- [ ] Extend the COOP/COEP header assertions to any new streaming or edge-rendered routes (e.g., `/api/voice`), and document them beside the Playwright isolation suite so CI keeps guarding future additions. 【F:playwright/tests/isolation.spec.ts†L11-L65】
- [ ] When introducing alternative caching layers or CDN rewrites, verify the service worker fallback still honors isolation headers and update `public/sw.js` if new worklet bundles must be pre-cached for offline reloads. 【F:public/sw.js†L3-L55】

## Low-Latency Microphone Capture

**Current posture**

- The practice experience opens an `AudioContext` with an `interactive` latency hint, selects specific devices, and disables browser DSP before wiring into an AudioWorklet node. 【F:app/practice/page.tsx†L240-L307】
- FlowRunner relies on 48 kHz mono capture without echo cancellation, then pushes samples through an in-memory engine using a `ScriptProcessorNode`. 【F:flow/FlowRunner.tsx†L180-L257】
- Playwright supplies deterministic microphone streams via `useFakeMic`, and smoke tests cover fallback behaviour when custom devices fail. 【F:playwright/tests/helpers/fakeMic.ts†L3-L62】【F:playwright/tests/smoke.spec.ts†L223-L256】

**Follow-up actions**

- [ ] Replace the legacy `ScriptProcessorNode` path in FlowRunner with an `AudioWorkletNode` so production capture matches the practice pipeline and avoids main-thread stalls; update CI to reuse the fake mic helper during regression tests. 【F:flow/FlowRunner.tsx†L193-L246】【F:playwright/tests/helpers/fakeMic.ts†L3-L62】
- [ ] Add a Playwright (or Vitest + jsdom) assertion that inspects `MediaStreamTrack.getSettings()` to confirm EC/NS/AGC flags stay disabled across supported browsers, matching the coaching requirements. 【F:app/practice/page.tsx†L253-L272】

## Browser-Side Pitch Tracking

**Current posture**

- The pitch worklet module is loaded at runtime, streaming messages with pitch, centroid, and clarity metrics back to the UI loop. 【F:app/practice/page.tsx†L282-L307】
- `public/worklets/pitch-processor.js` maintains a hop-based buffer, estimates F0 via autocorrelation, and posts results to the main thread. 【F:public/worklets/pitch-processor.js†L1-L54】
- The service worker pre-caches pitch/LPC processors alongside the practice route to keep AudioWorklet modules available when offline isolation tests run. 【F:public/sw.js†L3-L55】
- Isolation tests watch for AudioWorklet console output to ensure the processors continue loading under different network conditions. 【F:playwright/tests/isolation.spec.ts†L44-L121】

**Follow-up actions**

- [ ] Instrument the pitch worklet message loop with health counters (e.g., dropped-frame telemetry) and assert their presence in CI so Codex-Cloud can detect regressions in processing cadence. 【F:app/practice/page.tsx†L286-L299】
- [ ] Update the offline isolation specs to assert that new or refactored worklet bundles (energy/LPC successors) are served from cache, mirroring the existing pitch coverage. 【F:playwright/tests/isolation-offline-fix.spec.ts†L38-L55】【F:public/sw.js†L3-L55】
