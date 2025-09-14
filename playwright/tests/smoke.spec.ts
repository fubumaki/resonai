import { test, expect } from '@playwright/test';

test('instant practice route loads and shows Start button', async ({ page }) => {
  await page.goto('/try');
  await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
});
