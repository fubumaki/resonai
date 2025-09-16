## Summary

This PR refreshes the SSOT snapshot and flake statistics after the latest CI run.
It ensures RUN_AND_VERIFY.md reflects the newest green commit and updates the bridge workflow expectations.

## Details

- Updated `.artifacts/SSOT.md` and the SSOT block in `RUN_AND_VERIFY.md` with the output from `scripts/ci-summary.ts`.
- CI is green: typechecking, linting, Vitest unit tests, and Playwright PR lane tests all pass.
- No new dependencies or inline styles were introduced.

## Checklist

- [x] SSOT block updated with commit `4498af8` and latest metrics
- [x] `.artifacts/SSOT.md` committed
- [x] CI green (unit, lint, Playwright PR lane)
- [x] `AGENTS.md` unchanged
- [x] CSP and accessibility guardrails maintained

@cloud ready-for-gate
