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

