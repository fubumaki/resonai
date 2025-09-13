import { test, expect } from '@playwright/test';

test('crossOriginIsolated online/offline', async ({ page, context }) => {
  await page.goto('/dev/status');
  const iso = page.locator('text=crossOriginIsolated: ✅');
  await expect(iso).toBeVisible();

  // Go offline then reload
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('text=crossOriginIsolated: ✅')).toBeVisible();
});
