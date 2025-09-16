import { test, expect } from '@playwright/test';

test.describe('Primer Flows', () => {
  test('E2A variant shows primer dialog', async ({ page }) => {
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
      localStorage.setItem('ab:E2', 'B');
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

    // No dialog should appear
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeHidden();
  });
});