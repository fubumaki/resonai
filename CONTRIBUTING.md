# Contributing to Resonai

Thanks for contributing! This project enforces strong security and quality guardrails to keep iteration fast and safe.

## Guardrails (must follow)

- CSP strict: no JSX `style=` and no `dangerouslySetInnerHTML`.
- Cross‑origin isolation: do not remove COOP/COEP headers.
- Budgets: TypeScript/ESLint/A11y/Unit/E2E must be green in CI.
- Local‑first: do not add network beacons/SDKs; never upload audio.

## Pre‑commit

We use Husky + lint‑staged for fast feedback on staged files.

- Install hooks once: `npx husky install` (or run `pnpm dlx husky install`).
- Hooks run: invisible/bidi unicode check, ASCII check for `app/**`, no‑inline‑style guard.

## Break‑glass procedure (rare)

If a change must introduce non‑ASCII or inline styling (strongly discouraged):

1. Open a PR with the change behind a small, isolated diff.
2. Add a `docs/DECISIONS.md` entry describing the exception, owner, and duration.
3. Tag a maintainer for explicit approval. CI may be temporarily adjusted only in that PR.

## PRs

- Small, focused diffs. Reference the exact `TASKS.md` item.
- Title prefix: `[cursor] …` (UI/feature) or `[codex] …` (infra/CI/security).
- Run `pnpm run ci` locally before requesting review.

Happy shipping!

