import { test, expect } from '@playwright/test';

test('home page includes web app manifest link', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/manifest.webmanifest');
});

