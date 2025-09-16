# CI Single Source of Truth

**Last green commit:** _pending — current run has failures (Playwright (firefox): 58 failed)._
**Current commit:** `02f7ece` (2025-09-16 06:55 UTC)

Generated: 2025-09-16 07:16 UTC

## Totals

| Suite | Passed | Failed | Skipped | Flaky | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Vitest | 85 | 0 | 0 | 0 | 0.08s |
| Playwright (firefox) | 5 | 58 | 5 | 0 | 1m 6.27s |

## Flakiest specs

1. `playwright/tests/a11y_min.spec.ts` — permission primer dialog is accessible when shown (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
2. `playwright/tests/smoke.spec.ts` — data privacy page is accessible (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
3. `playwright/tests/smoke.spec.ts` — export/import/clear controls are visible (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
4. `playwright/tests/manifest-link.spec.ts` — home page includes web app manifest link (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
5. `playwright/tests/smoke.spec.ts` — fallback to default mic shows toast (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox

_Source: `.artifacts/vitest.json`, `.artifacts/playwright.json`._

