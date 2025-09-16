# CI Single Source of Truth

**Last green commit:** `548ca7e` (2025-09-13 04:03 UTC)
**Current commit:** `b22e630` (2025-09-16 05:57 UTC — Playwright (firefox): 22 failed)

Generated: 2025-09-16 06:33 UTC

## Totals

| Suite | Passed | Failed | Skipped | Flaky | Duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Vitest | 85 | 0 | 0 | 0 | 0.08s |
| Playwright (firefox) | 34 | 22 | 12 | 0 | 6m 5.42s |

## Flakiest specs

1. `playwright/tests/a11y_min.spec.ts` — permission primer dialog is accessible when shown (failed ×1) — 10.8s — Locator: getByRole('dialog')
2. `playwright/tests/analytics_beacon.spec.ts` — analytics events are posted (sendBeacon stub + forced flush) (failed ×1) — 10.4s — Expected: [32mArrayContaining ["screen_view", "permission_requested"][39m
3. `playwright/tests/smoke.spec.ts` — fallback to default mic shows toast (failed ×1) — 8.95s — Locator: locator('#toasts')
4. `playwright/tests/smoke.spec.ts` — data privacy page is accessible (failed ×1) — 8.01s — Locator: getByText('Local‑first by design')
5. `playwright/tests/mic_flow.spec.ts` — one-tap mic toggles recording and emits analytics (failed ×1) — 7.24s — Locator: locator('.pitch-meter')

_Source: `.artifacts/vitest.json`, `.artifacts/playwright.json`._

