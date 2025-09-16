import { test, expect } from '@playwright/test';
import { PERMISSION_PRIMER_COPY } from '../../lib/permission-primer';

test.describe('Primer Flows', () => {
  test('E2A variant shows primer dialog', async ({ page }) => {
    // Set up E2A variant (primer dialog)
    await page.goto('/try');
    await page.evaluate(() => {
      localStorage.setItem('ab:E2', 'A');
      localStorage.setItem('ff.permissionPrimerShort', 'true');
    });
    await page.reload();

    const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
    await startBtn.click();

    // Dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    
    // Check dialog content
    await expect(dialog.locator('h2')).toContainText(PERMISSION_PRIMER_COPY.title);
    
    // Continue button should be present
    const continueBtn = dialog.getByRole('button', { name: PERMISSION_PRIMER_COPY.actions.primary });
    await expect(continueBtn).toBeVisible();
    
    // Click continue
    await continueBtn.click();
    
    // Dialog should close
    await expect(dialog).toBeHidden();
  });

  test('E2B variant skips primer dialog', async ({ page }) => {
    // Set up E2B variant (no primer)
    await page.goto('/try');
    await page.evaluate(() => {
      localStorage.setItem('ab:E2', 'B');
      localStorage.setItem('ff.permissionPrimerShort', 'true');
    });
    await page.reload();
    
    const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
    await startBtn.click();

    // No dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeHidden();
  });
});