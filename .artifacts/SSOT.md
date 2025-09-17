# CI Single Source of Truth

**Last green commit:** _pending — current run has failures (Vitest: 6 failed; Playwright (firefox): 73 failed)._
**Current commit:** `31afdc0` (2025-09-17 03:22 UTC)

Generated: 2025-09-17 03:48 UTC

## Totals

| Suite | Passed | Failed | Skipped | Flaky | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Vitest | 158 | 6 | 0 | 0 | 12.7s |
| Playwright (firefox) | 5 | 73 | 5 | 0 | 2m 1.50s |

## Flakiest specs

1. `playwright/tests/smoke.spec.ts` — practice page has persistent settings features (failed ×1) — 0.02s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
2. `playwright/tests/headers.ci.spec.ts` — Practice route is crossOriginIsolated and has COOP/COEP (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
3. `playwright/tests/smoke.spec.ts` — session summary shows after a trial (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
4. `playwright/tests/a11y_quick_wins.spec.ts` — error messages are announced to screen readers (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
5. `playwright/tests/smoke.spec.ts` — practice page loads without errors (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox

_Source: `.artifacts/vitest.json`, `.artifacts/playwright.json`._

