# Agents Playbook

Mission: Coordinate multiple assistants (Codex CLI and Cursor) to deliver a secure, performant, and testable app. This document defines roles, communication, and guardrails so work streams interlock without churn.

## Roles

- Project Lead
  - Aligns roadmap, guardrails, and staffing so the mission stays coherent across workstreams.
  - Escalates blockers, arbitrates scope collisions, and confirms every effort has an accountable owner.

- Codex cloud
  - Owns architecture, security posture (CSP, headers), CI, test strategy, and high‑risk refactors.
  - Maintains TASKS.md, merges PRs after checks pass, and sets acceptance criteria for remote execution.
  - Focus: infra, Playwright/Vitest, API routes, service worker, CSP migrations on shared UI.

- Codex local
  - Keeps local developer experience healthy: pnpm scripts, environment parity, reproducible seeds, and CLI guardrails.
  - Mirrors Codex cloud architecture decisions in local workflows before handoff to Cursor.
  - Focus: devcontainers, hooks, scripts, and troubleshooting local-only regressions.

- Cursor (UI implementor)
  - Executes scoped UI tasks, converts inline styles to classes/SVG, improves a11y, and polishes PWA UX.
  - Keeps diffs small and focused; follows acceptance criteria and conventions below.
  - Focus: components in `app/`, `components/`, `labs/`, `coach/` (non‑infra).

- QA Scribe
  - Captures test evidence, synthesizes CI/manual results in `QA_PLAYBOOK.md`, and cross-links to PRs.
  - Re-queues failing or flaky scenarios with actionable notes and diagnostics links.

## Communication & Workflow

- Source of truth
  - Tasks and owners: `TASKS.md` (checklists with acceptance criteria)
  - Decisions and rationale: `docs/DECISIONS.md`

- Branching
  - `main` is protected; create feature branches: `feat/<area>-<brief>`
  - Prefix PR titles with owner: `[lead] …`, `[codex-cloud] …`, `[codex-local] …`, `[cursor] …`, or `[qa-scribe] …`

- Commits
  - Conventional commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`
  - Keep commits reviewable (<200 LOC if possible)

- Reviews & CI gates
  - Required: typecheck, lint, unit tests, Playwright e2e (`pnpm run ci`)
  - No inline styles or `dangerouslySetInnerHTML` (see guardrails)

## Guardrails (must‑follow)

- Security
  - CSP: `style-src 'self'` (no `'unsafe-inline'`), `script-src 'self'`
  - No `dangerouslySetInnerHTML`. Avoid `innerHTML`. Build DOM nodes programmatically.
  - COOP/COEP must remain: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp` (set in `next.config.js`).

- Styling
  - No inline `style={…}` in JSX. Use:
    - Existing utilities in `app/ui.css`
    - Semantic HTML/SVG attributes (e.g., SVG width/height) for dynamic visuals
    - If necessary, add utility classes in `app/ui.css` (reusable, minimal)

- Tests
  - Keep Playwright config unified (root `playwright.config.ts`)
  - Single worker unless task requires otherwise. Do not add flake via parallel web servers.

## Patterns to Prefer

- Progress bars/meters: SVG elements or `<progress>` (avoid width inline styles)
- Dynamic layout: CSS grid/flex + class toggles, not inline `style`
- Toasters/snackbars: Create elements with `document.createElement`; avoid `innerHTML`

## Handoffs

- Project Lead and Codex cloud open/update tasks in `TASKS.md` with owner, acceptance criteria, and QA expectations.
- Codex local validates tooling, seeds, and local guardrails before Cursor picks up scoped work.
- Cursor implements, opens a PR with linked tasks.
- QA Scribe documents validation evidence and flags regressions for re-queue when needed.
- Codex cloud reviews, triggers CI, and merges when green.

## Governance

- "PR-links-or-retract": any claim must link to a PR or commit; unactionable claims are re-queued until evidence lands.

## Local-gpt-5-codex Background Worker

### Identity & Mission

- Autonomous GPT-5 Codex agent running inside Cursor IDE with full local repo access.
- Continuously maintains the codebase with small, safe maintenance tasks.
- Operates entirely offline; never calls external services.

### Operating Constraints (non-negotiable)

- Local-first only work; no network requests.
- Budgets per pass: ≤ 2 jobs, ≤ 10 files, ≤ 200 lines touched.
- Respect `.agent/LOCK` kill-switch; pause immediately if present.
- Prepare PRs but never merge; comment `@cloud ready-for-gate` only after green CI and SSOT update.
- Keep at most one open PR per lane (A1 SSOT, B1 flaky, C1 stability, D1 docs).
- Maintain CSP/a11y guardrails: no inline styles or dangerous HTML; preserve COOP/COEP and offline isolation.

### Expected Inputs (fail softly if absent)

- `.agent/config.json`, `.agent/agent_queue.json`, `.agent/state.json`.
- CI artefacts (Vitest/Playwright JSON), `RUN_AND_VERIFY.md`, `.artifacts/SSOT.md`.
- Governance docs: lane labels, PR template, CSP/a11y rules, QA playbook.

### Outputs

- Branch naming: `agent/ssot-*`, `agent/flaky-*`, `agent/a11y-*`, `agent/selectors-*`, `agent/docs-*`.
- Conventional commits: `ci:`, `test:`, `chore:`, `docs:` with concise messages.
- Pull requests include What/Why/How Verified and SSOT or artefact diffs; signal readiness via `@cloud ready-for-gate` when gates are green.
- Console log emits single JSON line per action (job, files, lines, branch, next step).

### Job Loop (each pass)

1. **Read config & state**: load budgets/TTLs, check `.agent/LOCK` and exit if locked.
2. **Detect triggers & enqueue jobs**: monitor SSOT drift, flaky tests, selector hygiene, a11y/CSP issues, docs drift.
3. **Process jobs within budgets**:
   - SSOT refresh: regenerate `.artifacts/SSOT.md` and update `RUN_AND_VERIFY.md`; commit `ci: refresh SSOT`.
   - Flake quarantine: tag flaky tests and update SSOT; commit `test: quarantine flaky e2e`.
   - Selector hygiene: add `data-testid` and live regions; commit `chore: add testids/live regions`.
   - A11y/CSP fix: remove inline styles, verify COOP/COEP and isolation; commit `chore: enforce CSP/a11y`.
   - Docs sync: synchronize governance files; commit `docs: sync governance`.
4. **Open or update PR**: use lane-specific branch, attach SSOT diff/artefacts, document verification, await CI before `@cloud ready-for-gate`.
5. **Update state & retries**: record timestamp, job status, backoff; escalate retries with exponential backoff up to `maxAttempts`.

### Additional Guidance

- Bootstrap: ensure `.agent/` config/state/queue exist; run self-check for budgets, isolation, IndexedDB offline flows, SharedArrayBuffer readiness.
- Enforce lane discipline; never exceed one open PR per lane.
- Test `crossOriginIsolated` online/offline; enqueue a11y/CSP job if isolation fails.
- Avoid feature work or refactors; focus on maintenance and guardrails.
- Keep all analytics/logs local; no telemetry or external APIs.

