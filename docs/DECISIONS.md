# Architectural Decisions Log

Chronological record of decisions and rationale for future reference.

## 2025-09-14 — Security posture and testing workflow

- COOP/COEP required
  - Decision: Add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` via `next.config.js` headers.
  - Rationale: Enables `crossOriginIsolated` for AudioWorklets/SAB and stabilizes isolation tests.

- CSP stays strict
  - Decision: Keep `style-src 'self'` and prohibit inline styles and `dangerouslySetInnerHTML`.
  - Rationale: Reduce XSS risk; maintain consistent, testable rendering.

- Playwright config unified
  - Decision: `playwright/playwright.config.ts` re-exports root config to avoid drift.
  - Rationale: Single source of truth reduces flake and misconfiguration.

- Service worker precache naming
  - Decision: Standardize on `APP_SHELL` and update `scripts/build-precache.js` to edit that array.
  - Rationale: Avoids confusion with mismatched variable names.

- CI pipeline
  - Decision: GitHub Actions with `pnpm run ci` (typecheck, lint, unit, e2e) and report artifact upload.
  - Rationale: Fast feedback loop and reproducible checks for agents.

## 2025-09-15 — Mini-specs intake (pending decisions)

Status: Pending ratification. The following areas require explicit decisions before or during implementation. Owners to propose deltas; Codex to approve and record final values.

1) Mic calibration flow — Owner: Cursor
- Decide: thresholds (clip/no-signal, noise floor), persistence shape.

2) Practice HUD — Owner: Cursor
- Decide: metric set, sampling windows, color tokens.

3) Prosody drills catalog — Owner: Cursor
- Decide: final sentence list per level; exemplar sourcing plan.

4) Worklet tuning — Owner: Cursor
- Decide: frame/hop/window constants; smoothing; CPU budget.

5) Fallback (non-isolated) — Owner: Cursor
- Decide: YIN params; UI degrade rules.

6) H1–H2 proxy — Owner: Cursor
- Decide: normalization (LTAS/device EQ), z-scoring policy.

7) CSP hardening — Owner: Codex
- Decide: any nonce use exceptions (default: none), CI checks.

8) COOP/COEP enforcement — Owner: Codex
- Decide: header set; CI verification scope; SW interplay.

9) Local-first policy — Owner: ChatGPT
- Decide: contributor Do/Don’t; wording for user explainer.

10) Playwright stabilization — Owner: Codex
- Decide: server orchestration, flake budget, artifact policy.

11) A11y plan — Owner: ChatGPT
- Decide: rule set and test tags; live-region throttle.

12) Budgets — Owner: Codex
- Decide: initial bundle/perf caps; change control process.

13) Offline caching (worklets/models) — Owner: Codex
- Decide: precache list and cache strategy; CORP headers.

14) TTV improvements — Owner: Cursor
- Decide: pre-warm points; parallelization; telemetry fields.

15) SW strategy — Owner: Codex
- Decide: runtime strategies and exclusions.

16) Live feedback UX — Owner: Cursor
- Decide: announce events and throttle policy.

17) Keyboard model — Owner: Cursor
- Decide: focus order; roving tabindex scope.

18) Color & contrast tokens — Owner: Cursor
- Decide: token names and values; dark/light mapping.

19) Local analytics schema — Owner: Codex
- Decide: fields, caps, retention; export format.

20) Cohorts/bucketing — Owner: Codex
- Decide: cohort range; experiment map; debug exposure.

21) Copy polish — Owner: ChatGPT
- Decide: punctuation standards; glossary for labels.

22) Internationalization plan — Owner: ChatGPT
- Decide: dictionary format; extraction process; key naming.

---

**Change control:** Budgets/headers/test gates are normative; deviations require explicit entries here.

