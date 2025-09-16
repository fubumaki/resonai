# CI Single Source of Truth

**Last green commit:** _pending — current run has failures (Playwright (firefox): 21 failed)._
**Current commit:** `b22e630` (2025-09-16 05:57 UTC)

Generated: 2025-09-16 06:37 UTC

## Totals

| Suite | Passed | Failed | Skipped | Flaky | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Vitest | 85 | 0 | 0 | 0 | 0.04s |
| Playwright (firefox) | 3 | 21 | 44 | 0 | 30.2s |

## Flakiest specs

1. `playwright/tests/a11y_quick_wins.spec.ts` — error messages are announced to screen readers (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
2. `playwright/tests/a11y_quick_wins.spec.ts` — primary CTA has proper focus-visible styles (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
3. `playwright/tests/a11y_quick_wins.spec.ts` — button accessible name includes both Start and Enable microphone (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
4. `playwright/tests/a11y_min.spec.ts` — permission primer dialog is accessible when shown (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox
5. `playwright/tests/a11y_quick_wins.spec.ts` — pitch meter has proper ARIA label (failed ×1) — 0.01s — Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/firefox-1490/firefox/firefox

_Source: `.artifacts/vitest.json`, `.artifacts/playwright.json`._

