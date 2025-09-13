import { test, expect } from '@playwright/test';

test('crossOriginIsolated status check', async ({ page }) => {
  await page.goto('/dev/status');
  
  // Check that the status page loads and shows cross-origin isolation status
  await expect(page.locator('text=Dev Status')).toBeVisible();
  await expect(page.locator('text=crossOriginIsolated:')).toBeVisible();
  
  // Check that WASM features are reported
  await expect(page.locator('text=wasmSIMD:')).toBeVisible();
  await expect(page.locator('text=wasmThreads:')).toBeVisible();
});
