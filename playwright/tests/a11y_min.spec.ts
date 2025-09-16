import { test, expect } from '@playwright/test';
import { useLocalStorageFlags } from './helpers';

test('permission primer dialog is accessible when shown', async ({ page }) => {
  await useLocalStorageFlags(page, {
    'ff.permissionPrimerShort': 'true',
    'ab:E2': 'A',
  });

  await page.goto('/try');

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
