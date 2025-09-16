# Local-First Integration Report

_Date: 2025-09-16_

## Overview
This note summarizes the current local-first posture of the Resonai voice trainer, with emphasis on:
- Cross-origin isolation when running on localhost and Vercel.
- Deterministic, low-latency microphone capture and pitch/intensity extraction kept fully client-side.
- Offline-ready practice flows backed by IndexedDB and accessible UX cues.
- Alignment with the interactive phonetics pattern guidance and QA hooks.

## Cross-Origin Isolation (Chrome & Firefox)
- Header policy:  sets strict CSP plus , , and  on every route (). These headers ship in both dev () and production builds.
- Verification: Playwright coverage checks the headers and  flag on cold and offline loads (). The status page also surfaces isolation health.
- Localhost nuances: Webpack dev assets inherit the same headers, but Chrome requires HTTPS or localhost; Firefox additionally fails isolation if  is enabled. QA should validate isolation in Firefox release and ESR with that pref at default.
- Worklets: AudioWorklet modules live in , which keeps them same-origin and avoids  fetch penalties. Ensure any future WASM/worker assets also live under  or  to inherit CORP.
- Vercel: Deployed instances must confirm that serverless functions (if added) echo the COOP/COEP headers.  currently delegates to Next defaults; no extra config is required but Codex-Cloud should monitor for regressions in the platform CDN cache.
- Service worker: Offline caching must preserve headers; coordinate with Codex if the SW ever rewrites responses so COEP remains intact.

### Suggested follow-ups
1. Add a quick  utility (planned) that fetches  and asserts header presence for local sanity checks.
2. Capture a Firefox-specific troubleshooting blurb in RUN_AND_VERIFY so QA knows to inspect  if isolation fails despite headers.

## Microphone Capture & Pitch Stability
- Capture pipeline: The practice page acquires audio with , reuses a single , and posts data into  (, ). The context uses , and the worklet publishes pitch + spectral metrics every ~10 ms.
- Pitch engine:  blends autocorrelation, Kalman smoothing, and jitter metrics with adjustable hops (). The engine already guards for  before enabling CREPE ONNX acceleration.
- Local-only analytics: All trial metrics are written into Dexie tables (), capped at 20 entries per session, with DOM toasts for feedback.

### Best practices observed / recommended
- Keep  and  toggles surfaced in UI so singers can select raw capture; defaults align with typical speech setups.
- When  is false (Firefox with fingerprinting or exotic webviews), stay on the YIN detector path and degrade gracefully—already handled by conditional switching ().
- Consider exposing a  query that writes timing deltas to  to diagnose underruns without extra tooling.
- Prototype: Evaluate  at runtime and adapt constraints to disable  only when supported (helps Firefox ESR which may ignore booleans silently).
- For CREPE re-enable work: Onnx runtime requires threads+SIMD; ensure the bundle only attempts to import when  and  exist to avoid console noise.

## Local-First Practice Flow UX
- Offline persistence: Trials and settings load from IndexedDB on boot and sync on imports/exports (). Reset paths ( modal, export clear, programmatic ) all converge on  and dispatch a session reset event for other listeners.
- Accessibility: Session progress uses a visually hidden live region (), while  exposes WAI-ARIA values ().
- Test hooks: Practice test mode exposes  and respects , which our new reset harness leverages ().

### Suggested UX refinements
- Announce toast resets through  (already ); consider adding focus management after modals close for keyboard parity.
- Provide an optional offline tip banner sourced from IndexedDB to remind users that data never leaves the device; reuse existing toast helper to avoid inline styling.
- Expand presets copy to highlight expected targets and tie to design guidelines (pacing, visual anchors). A short text block within the practice hero area could reference recommended rehearsal cadence.
- Under reduced motion, confirm that  transitions are disabled (Playwright already asserts this); extend to progress meter if animations are added later.

## Pattern Library Alignment
- Use visual anchors similar to the interactive phonetics guidance: combine the existing pitch meter with textual descriptors (mezzo, soprano) for each preset. The layout already employs flex/grid tokens; maintain this while adding microcopy that frames each drill.
- Introduce short “call-to-action” checklists before/after sessions (e.g., vocal warmup, hydration reminder) stored in IndexedDB preferences, mirroring local-first diaries recommended by the design memo.
- Consider embedding SVG-based articulators or resonance bars that load from  to stay offline and style-safe. Keep animation toggles tied to .

## Testing & QA Aids
- Deterministic helpers already exist for mic/beacon stubbing (, ). Encourage QA to run  followed by  so SSOT reflects isolation-sensitive specs.
- Proposed toggle: Add  support that routes the worklet through  in development—useful when browsers block mic access in CI.
- Document the  flag and reset harness usage in RUN_AND_VERIFY to streamline reproduction of session resets offline.

## Coordination Requests
1. **Codex Cloud:** Confirm Vercel edge cache retains COOP/COEP on HTML, JSON, and API responses; add monitoring to bridge workflow.
2. **Cursor:** Wire the pending reset harness into the live selectors once  attributes are introduced, and add progress toast focus handling.
3. **QA:** Capture Firefox isolation evidence (headers + ) in RUN_AND_VERIFY, noting any config tweaks made.
4. **Documentation:** Author the missing “Stable Low-Latency Microphone Capture” memo referenced in tasks; current repo lacks it, so this report should seed its outline.

## Open Questions
- Should we precache the AudioWorklet and ONNX model via service worker to guarantee offline boot, and how do we maintain COEP headers when doing so?
- Is there value in exposing a manual “isolation diagnostics” panel in dev builds that surfaces  availability, worklet load duration, and mic constraint negotiation for support teams?
- Do we need to support Chromium-based WebViews where COOP/COEP cannot be set (e.g., Android WebView)? If so, define a non-isolated fallback UX beyond YIN.

---
To discuss or extend this report, reference the file  in future PRs and link artefacts in the bridge workflow as per PR-links-or-retract.
