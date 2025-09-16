# Agents Playbook

Mission: Coordinate multiple assistants (Codex CLI and Cursor) to deliver a secure, performant, and testable app. This document defines roles, communication, and guardrails so work streams interlock without churn.

## Roles

### Codex (coordinator)

- Owns architecture, security posture (CSP, headers), CI, test strategy, and high‑risk refactors.
- Maintains TASKS.md, merges PRs after checks pass, and sets acceptance criteria.
- Focus: infra, Playwright/Vitest, API routes, service worker, CSP migrations on shared UI.

**Acceptance criteria (Codex success conditions)**

- All tasks have explicit, testable acceptance criteria captured in `TASKS.md` before handoff.
- Every PR merged by Codex has green required checks (`pnpm run ci` suite) and documented rationale in `docs/DECISIONS.md` when governance shifts.
- Security and performance guardrails remain intact after review (headers, CSP, CI budgets).
- PR descriptions link to their governing task or decision, or Codex retracts/asks for revision within the same day.

### Cursor (UI implementor)

- Executes scoped UI tasks, converts inline styles to classes/SVG, improves a11y, and polishes PWA UX.
- Keeps diffs small and focused; follows acceptance criteria and conventions below.
- Focus: components in `app/`, `components/`, `labs/`, `coach/` (non‑infra).

**Acceptance criteria (Cursor success conditions)**

- Implements features that satisfy the success metrics written in the associated task without breaking guardrails (no inline styles, CSP-safe patterns).
- Ships UX updates with accompanying accessibility notes/tests when required, or flags blockers back to Codex.
- Links each PR to the relevant `TASKS.md` entry and summarizes coverage of acceptance criteria; unlinked work is retracted or resubmitted once linked.
- Provides screenshots or recordings for perceptible UI changes unless tooling limitations are documented.

## Communication & Workflow

- Source of truth
  - Tasks and owners: `TASKS.md` (checklists with acceptance criteria)
  - Decisions and rationale: `docs/DECISIONS.md`

- Branching
  - `main` is protected; create feature branches: `feat/<area>-<brief>`
  - Prefix PR titles with owner: `[codex] …` or `[cursor] …`

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

- Codex opens/updates tasks in `TASKS.md` with owner and acceptance criteria.
- Cursor implements, opens a PR with linked tasks.
- Codex reviews, triggers CI, and merges when green.

## QA Governance

### QA responsibilities

- Codex oversees quality planning, but both agents share QA execution: maintain `README_QA.md`, `QA_PLAYBOOK.md`, and keep `QA_SNAPSHOT_TEMPLATE.md` current.
- Before release branches, Codex confirms snapshot checklists are up-to-date and Cursor executes exploratory passes scoped to new UI.
- Either agent can file QA bugs; Codex triages severity and updates gating policies accordingly.

### Gating policies

- CI is a hard gate: `pnpm run ci` must be green before merge; flaky tests trigger rollback or skip only with a documented decision entry.
- Manual QA sign-off is required for features tagged "user-facing" in `TASKS.md`; absence of sign-off pauses deployment.
- Security headers, CSP rules, and perf budgets defined in `docs/DECISIONS.md` are non-negotiable gates; changes require prior ratification.
- Playwright traces and Vitest coverage artifacts must be attached for red/failed runs before reattempting merge.

### PR-links-or-retract rules

- Every PR must link to at least one `TASKS.md` item or `docs/DECISIONS.md` entry; missing links require closing or draft conversion within 24 hours.
- If a PR drifts from its linked task (scope creep, unmet acceptance criteria), the owner retracts it or amends the governing task before requesting review.
- Hotfix PRs still document their rationale post-merge; failure to follow-up requires immediate rollback.

