import { test, expect } from '@playwright/test';

test('permission primer dialog is accessible when shown', async ({ page }) => {
  await page.goto('/try');

  // Trigger primer if your UI gates mic behind a dialog in variant A
  await page.evaluate(() => {
    // Force the short primer path if feature-flagged
    localStorage.setItem('ff.permissionPrimerShort', 'true');
    // Force E2 variant A to trigger primer dialog
    localStorage.setItem('ab:E2', 'A');
  });
  await page.reload();

  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  await startBtn.click();

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
