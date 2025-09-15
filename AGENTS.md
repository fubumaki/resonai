# Agents Playbook

Mission: Coordinate multiple assistants (Codex CLI and Cursor) to deliver a secure, performant, and testable app. This document defines roles, communication, and guardrails so work streams interlock without churn.

## Roles

- Codex (coordinator)
  - Owns architecture, security posture (CSP, headers), CI, test strategy, and high‑risk refactors.
  - Maintains TASKS.md, merges PRs after checks pass, and sets acceptance criteria.
  - Focus: infra, Playwright/Vitest, API routes, service worker, CSP migrations on shared UI.

- Cursor (UI implementor)
  - Executes scoped UI tasks, converts inline styles to classes/SVG, improves a11y, and polishes PWA UX.
  - Keeps diffs small and focused; follows acceptance criteria and conventions below.
  - Focus: components in `app/`, `components/`, `labs/`, `coach/` (non‑infra).

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

