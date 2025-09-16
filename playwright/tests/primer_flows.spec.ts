import { test, expect } from '@playwright/test';
import { useLocalStorageFlags } from './helpers';

test.describe('Primer Flows', () => {
  test('E2A variant shows primer dialog', async ({ page }) => {
    await useLocalStorageFlags(page, {
      'ab:E2': 'A',
      'ff.permissionPrimerShort': 'true',
    });
    await page.goto('/try');

    const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
    await startBtn.click();

    // Dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    // Check dialog content
    await expect(dialog.locator('h2')).toContainText('Microphone Access');
    
    // Continue button should be present
    const continueBtn = dialog.getByRole('button', { name: /continue/i });
    await expect(continueBtn).toBeVisible();
    
    // Click continue
    await continueBtn.click();
    
    // Dialog should close
    await expect(dialog).toBeHidden();
  });

  test('E2B variant skips primer dialog', async ({ page }) => {
    await useLocalStorageFlags(page, {
      'ab:E2': 'B',
      'ff.permissionPrimerShort': 'true',
    });
    await page.goto('/try');

    const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
    await startBtn.click();

    // No dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeHidden();
  });
});