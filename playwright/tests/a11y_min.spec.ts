import { test, expect } from '@playwright/test';

test('@flaky permission primer dialog is accessible when shown', async ({ page }) => {
  // Set pilot cohort cookie to allow access to /try page
  await page.context().addCookies([{
    name: 'pilot_cohort',
    value: 'pilot',
    domain: 'localhost',
    path: '/',
  }]);
  
  // Set localStorage after navigation but before React initializes
  await page.goto('/try');
  
  // Set the flags immediately after navigation
  await page.evaluate(() => {
    localStorage.setItem('ab:E2', 'A');
    localStorage.setItem('ff.permissionPrimerShort', 'true');
    localStorage.setItem('ff.instantPractice', 'true');
  });
  
  // Reload the page to ensure React reads the new flags
  await page.reload();
  
  // Wait for React to hydrate and the page to be interactive
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('button', { timeout: 10000 });

  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  await startBtn.click();
  
  // Wait for the dialog to appear
  await page.waitForTimeout(500);

  // Dialog semantics (labels may vary; adjust ids to match your UI)
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  // Check that dialog has either aria-labelledby or aria-label
  const hasAriaLabel = await dialog.getAttribute('aria-labelledby');
  const hasAriaLabelBy = await dialog.getAttribute('aria-label');
  expect(hasAriaLabel || hasAriaLabelBy).toBeTruthy();

  // Continue closes the dialog and requests mic
  const cont = dialog.getByRole('button', { name: /continue|allow/i });
  await cont.click();
  await expect(dialog).toBeHidden();
});
