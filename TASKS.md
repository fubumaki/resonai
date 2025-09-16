# Task Board

**Source of truth:** This backlog is canonical. Any scope/security/budget change must be mirrored in **DECISIONS.md**.

Source of truth for planned work. Keep items small, focused, and actionable. Check items off in PRs and link commits. Any change that alters scope, budgets, or security posture must update docs/DECISIONS.md.

Legend: [codex] coordinator • [cursor] UI implementor • [either] any

## P0 - Security, Isolation, CI

- [codex] COOP/COEP in headers (done)
  - next.config.js updated with COOP/COEP; run isolation tests.

- [codex] Inline style removals (wave 1) (in progress)
  - app/layout.tsx footer → classes (done)
  - app/SwRegister.tsx toast → DOM nodes/classes (done)
  - app/PerfHUD.tsx → `perf-hud` class (done)
  - components/IsolationBanner.tsx → `banner-warning` (done)
  - components/ExpressivenessMeter.tsx → SVG meter (done)

- [cursor] Inline style removals (wave 2)
  - components/ProgressBar.tsx: remove `style={{ width: ... }}`
    - Acceptance: width without inline styles (SVG or CSS classes); keep a11y attributes.
  - app/analytics/page.tsx: convert `styles` object to classes/SVG; preserve layout.
    - Acceptance: no `style=`, passes existing e2e tests.
  - app/dev/status/page.tsx, app/dev/env/page.tsx: remove inline styles with utility classes.
  - labs/_components (PerfOverlay, ProsodyHud, Recorder): remove inline styles; add minimal utilities to `app/ui.css` if needed.

- [either] PWA icons
  - Add `public/icons/icon-192.png` and `icon-512.png` referenced in `public/manifest.webmanifest`.
  - Acceptance: Lighthouse PWA check passes icons requirement.

- [codex] Playwright config unification (done)
  - `playwright/playwright.config.ts` re-exports root config.

- [codex] CI pipeline (done)
  - `.github/workflows/ci.yml` runs typecheck, lint, unit + e2e, uploads report artifact.

## P1 - Testing & DX

- [either] Elevate ESLint inline-style rule to error
  - eslint.config.mjs: change from `warn` → `error` once wave 2 is complete.

- [codex] Unit tests path fixes (done)
  - tests/unit imports updated to actual paths.

- [either] SW precache alignment
  - `scripts/build-precache.js` now updates `APP_SHELL`; run and verify precache list.

## P2 - Polish

- [cursor] A11y polish where e2e asserts exist
  - Ensure focus styles and aria-live regions remain after CSS migrations.

- [either] Dependency bumps
  - Consider bumping Next and Playwright to latest compatible minor/patch; verify tests pass.

## How to Work

1) Pick an unassigned [cursor] task, open a branch `feat/ui-<area>`.
2) Implement with small diffs; add minimal utilities to `app/ui.css` when necessary.
3) Run `pnpm run ci`; fix lint and tests locally.
4) Open PR `[cursor] <task title>` linking checklist items here.
5) Codex reviews; if green, merges to main.

## P0.5 - Practice UI CSP (wave 3)

- [codex] Inline style removals (practice)
  - app/practice/page.tsx: remaining inline styles → utilities (in progress)
  - app/practice/ExportButton.tsx
  - app/practice/SessionSummary.tsx
  - app/practice/Trials.tsx
  - components/DiagnosticsHUD.tsx
  - components/drills/ProsodyDrill.tsx
  - Acceptance: no `style=`, visuals preserved, Playwright tests pass.

## P0.6 - Misc UI CSP (wave 4)

- [cursor] Remove lingering inline styles
  - app/analytics/page.tsx: replace row `style` borderBottom with a utility (e.g., `.row-divider`)
  - app/data/page.tsx: convert grid/gap and dashed panel inline styles to utilities
  - app/listen/page.tsx: replace audio width style with class (e.g., `w-full`)
  - Acceptance: no `style=` in changed files; visuals and a11y preserved.

## Roadmap Candidates (post-gating review)

_Review and reprioritize this section once P0 gating items and **10) Stabilize Playwright (flake)** are complete._

- [codex] Local-first adaptive practice mode (spec)
  - Acceptance: Flow diagram and session schema stored in IndexedDB with migration notes; zero remote fetches during practice.
  - Acceptance: Mode toggles degrade gracefully when isolation fails; offline-first fallback documented in `docs/DECISIONS.md`.
  - Acceptance: Privacy checklist signed off (no PII, wipe action clears local store).

- [cursor] Practice mode UI shells
  - Acceptance: Mode switcher and onboarding screens function offline; no network calls introduced by UI changes.
  - Acceptance: A/B of “Solo drill” vs “Adaptive loop” uses shared components, respects existing accessibility assertions.
  - Acceptance: Local session summaries readable with screen readers; `Clear data` button triggers local wipe flow.

- [codex] Local analytics insights (privacy-preserving)
  - Acceptance: Analytics summaries computed client-side from local ring buffer; export limited to CSV saved locally.
  - Acceptance: No identifiers persisted beyond hashed install ID; hashing implementation documented and tested.
  - Acceptance: Privacy guard tests fail if network requests originate from analytics module; CI gate added.

## Completed Tasks ✅

### Core CI Stabilization (feat/tests-stabilization-readiness)
- Owner: Cursor • Labels: ci, tests, stability
- Status: ✅ COMPLETED
- Acceptance: All TypeScript compilation passes, ESLint checks pass (0 errors), all 111 unit tests pass, session progress helpers working via page.addInitScript
- Changes: Added @typescript-eslint/eslint-plugin, fixed quote escaping, replaced inline styles with data-hue, fixed React imports, resolved rules-of-hooks violations
- Result: Core CI pipeline now stable and green. E2E test failures reduced from structural issues to feature-specific problems.

## Follow-up E2E Test Fixes (Priority Order)

### 1. Dialog Visibility Issues (4 tests)
- Owner: Cursor • Labels: e2e, dialogs, a11y
- Tests: a11y_min.spec.ts, accessible_dialog.spec.ts, primer_flows.spec.ts
- Issue: Permission dialogs and confirmation dialogs not appearing in headless mode
- Acceptance: All dialog tests pass, proper ARIA roles and focus management

### 2. Analytics Event Tracking (2 tests)  
- Owner: Cursor • Labels: e2e, analytics, events
- Tests: analytics_beacon.spec.ts, mic_flow.spec.ts
- Issue: sendBeacon events not being flushed, recording state not updating
- Acceptance: Analytics events properly tracked and flushed during tests

### 3. Offline/Caching Functionality (4 tests)
- Owner: Cursor • Labels: e2e, offline, service-worker
- Tests: isolation-offline-drills.spec.ts, isolation-offline-fix.spec.ts, isolation.spec.ts
- Issue: Service worker and worklet caching not working properly
- Acceptance: Offline functionality works, worklets load from cache

### 4. Accessibility Features (5 tests)
- Owner: Cursor • Labels: e2e, a11y, accessibility
- Tests: privacy_a11y.spec.ts, chrome-comparison.spec.ts
- Issue: Missing role="status" elements, focus management problems
- Acceptance: Proper ARIA roles, keyboard navigation, screen reader announcements

### 5. UI Component Rendering (4 tests)
- Owner: Cursor • Labels: e2e, ui, components
- Tests: smoke.spec.ts (CTA links, progress bars, meters)
- Issue: UI elements not rendering or not visible
- Acceptance: All UI components render correctly in headless mode

### 6. Reduced Motion & Mic Flow (2 tests)
- Owner: Cursor • Labels: e2e, css, audio
- Tests: reduce_motion.spec.ts, mic_flow.spec.ts
- Issue: CSS transition timing, microphone recording state
- Acceptance: Reduced motion preferences respected, mic state updates correctly

### 7. Feature Flags & Experiments (1 test)
- Owner: Cursor • Labels: e2e, experiments, feature-flags
- Tests: experiments.spec.ts
- Issue: E1/E2 variant assignment not working
- Acceptance: Feature flags properly assigned and persisted

## Research Backlog (Mini-specs)

1) Mic calibration flow (Device → Level → Environment)
- Owner: Cursor • Labels: ui, a11y
- Acceptance: 3-step flow completes <30s; deviceId/constraints persisted; “Retest mic”; noise floor warn > -45 dBFS; disabled CTA on no input.

2) Practice HUD (minimal signals)
- Owner: Cursor • Labels: ui, a11y, perf
- Acceptance: Pitch/brightness/confidence + in-range%; 60 fps target; AA contrast; 12px min text; 0 axe violations.

3) Prosody drills (10 pairs/level)
- Owner: Cursor • Labels: content, ui
- Acceptance: JSON catalog (level, text, target band, exemplar id); Listen page A/B exemplars; terminal movement hints.

4) Worklet tuning (low-latency pitch + centroid)
- Owner: Cursor • Labels: dsp, perf
- Acceptance: Pitch RMS ≤ 3–5 Hz on sustained vowels; CPU < 15% of 1 core; parameters documented.

5) Fallbacks when crossOriginIsolated=false (YIN path)
- Owner: Cursor • Labels: dsp, perf, reliability
- Acceptance: Pitch jitter ≤ ±10 Hz; UI ≥ 45 fps; degrade banner shown.

6) H1–H2 proxy (breathiness)
- Owner: Cursor • Labels: dsp, research
- Acceptance: Correlates ρ>0.6 with subjective ratings; stable across ±6 dB gain.

7) CSP hardening (strict)
- Owner: Codex • Labels: security, ci
- Acceptance: No JSX style or dangerouslySetInnerHTML; CI CSP check green; ESLint rule enforced.

8) COOP/COEP pitfalls (Next/Vercel)
- Owner: Codex • Labels: security, infra
- Acceptance: crossOriginIsolated === true on Practice; Playwright header checks; fallback banner if isolation fails.

9) Local-first policy (explainer + contributor guide)
- Owner: ChatGPT • Labels: docs, privacy
- Acceptance: “Data & Privacy” page matches policy; test forbids network calls from Practice; DECISIONS entry for any network changes.

10) Stabilize Playwright (flake)
- Owner: Codex • Labels: e2e, infra
- Acceptance: <1% flake over 50 CI runs; no external network; artifacts uploaded.

11) A11y test plan (axe + live regions)
- Owner: ChatGPT • Labels: a11y, tests
- Acceptance: Axe=0 on Landing/Practice/Listen; keyboard-only path; live-region policy documented.

12) Budgets (protective)
- Owner: Codex • Labels: ci, perf
- Acceptance: Budgets encoded in QUALITY-GATES; any change requires DECISIONS entry; CI gate passing.

13) Offline caching of worklets/models
- Owner: Codex • Labels: pwa, perf, infra
- Acceptance: addModule never 404s offline; isolation remains true; CORP on cached assets.

14) Time-to-Voice (TTV) improvements
- Owner: Cursor • Labels: perf
- Acceptance: p50 ≤ 1.5s, p95 ≤ 2.5s; local telemetry recorded.

15) SW strategy (no COEP/CORP violations)
- Owner: Codex • Labels: pwa, security
- Acceptance: COEP green with SW; Playwright verifies headers on cached responses.

16) Live feedback UX (announce without noise)
- Owner: Cursor • Labels: a11y, ui
- Acceptance: ≤2 announcements/sec; NVDA/VoiceOver behave predictably; mute toggle.

17) Keyboard model (Practice)
- Owner: Cursor • Labels: a11y, ui
- Acceptance: Full keyboard path; visible focus; correct roles/names.

18) Color & contrast tokens
- Owner: Cursor • Labels: a11y, ui
- Acceptance: AA contrast; forced-colors readable; dark/light parity.

19) Minimal local analytics schema (no PII)
- Owner: Codex • Labels: data, privacy
- Acceptance: Ring buffer sessions; CSV export; Clear wipes store; no PII.

20) Cohorts/bucketing (client-only)
- Owner: Codex • Labels: experiments, privacy
- Acceptance: Stable per-install cohort; no fingerprinting; debug visibility.

21) Copy polish (punctuation & labels)
- Owner: ChatGPT • Labels: content
- Acceptance: No mojibake; consistent punctuation; tooltips ≤ 120 chars.

22) Internationalization plan (minimal)
- Owner: ChatGPT • Labels: i18n, content
- Acceptance: Tiny dictionary, dev language toggle, missing-key scanner; bundle bloat ≤ +10 KB.

