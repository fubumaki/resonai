# CI Single Source of Truth

- **sha:** `5d61047`
- **date:** 2025-09-16 06:49 UTC
- **vitest:** 85 passed · 0 failed · 0 skipped · 0 flaky — 0.08s
- **playwright (firefox):** 34 passed · 22 failed · 12 skipped · 0 flaky — 6m 5.42s
- **flakiest:**
  1. `playwright/tests/a11y_min.spec.ts` — permission primer dialog is accessible when shown (failed ×1) — 10.8s — Locator: getByRole('dialog')
  2. `playwright/tests/analytics_beacon.spec.ts` — analytics events are posted (sendBeacon stub + forced flush) (failed ×1) — 10.4s — Expected: ArrayContaining ["screen_view", "permission_requested"]
  3. `playwright/tests/smoke.spec.ts` — fallback to default mic shows toast (failed ×1) — 8.95s — Locator: locator('#toasts')
  4. `playwright/tests/smoke.spec.ts` — data privacy page is accessible (failed ×1) — 8.01s — Locator: getByText('Local‑first by design')
  5. `playwright/tests/mic_flow.spec.ts` — one-tap mic toggles recording and emits analytics (failed ×1) — 7.24s — Locator: locator('.pitch-meter')

_Source: `.artifacts/vitest.json`, `.artifacts/playwright.json`._
