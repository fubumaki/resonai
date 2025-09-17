# CI Single Source of Truth

**Last green commit:** _pending - current run has failures (Playwright (firefox): 24 failed)._
**Current commit:** `d0ee2ae` (2025-09-17 02:34 UTC)

Generated: 2025-09-17 02:40 UTC

## Totals

| Suite | Passed | Failed | Skipped | Flaky | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Vitest | 96 | 0 | 0 | 0 | 0.22s |
| Playwright (firefox) | 34 | 24 | 12 | 0 | 4m 56.2s |

## Flakiest specs

1. `playwright/tests/analytics_beacon.spec.ts` - @flaky analytics events are posted (sendBeacon stub + forced flush) (failed x1) - 8.89s - Expected: ArrayContaining ["screen_view", "permission_requested"]
2. `playwright/tests/a11y_min.spec.ts` - @flaky permission primer dialog is accessible when shown (failed x1) - 8.61s - Locator: getByRole('dialog')
3. `playwright/tests/smoke.spec.ts` - @flaky home has CTA and nav (failed x1) - 8.00s - Locator: locator('main').getByRole('link', { name: 'Start practice (no sign-up)' })
4. `playwright/tests/smoke.spec.ts` - @flaky fallback to default mic shows toast (failed x1) - 7.61s - Locator: locator('#toasts')
5. `playwright/tests/smoke.spec.ts` - @flaky data privacy page is accessible (failed x1) - 6.93s - Locator: getByText('Local-first by design')

_Source: `.artifacts/vitest.json`, `.artifacts/playwright.json`._

