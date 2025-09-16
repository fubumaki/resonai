import { test, expect } from '@playwright/test';
import { useFakeMic } from './helpers/fakeMic';

test.describe('Practice session progress resets', () => {
  test('resets progress via settings actions and clear button', async ({ page }) => {
    await useFakeMic(page);
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Wait for progress UI to be present deterministically
    await page.waitForSelector('[data-testid="progress-count"]', { state: 'attached' });

    await page.evaluate(() => {
      if (typeof window.__setPracticeProgress === 'function') {
        window.__setPracticeProgress(4);
      } else {
        window.dispatchEvent(new CustomEvent('practice:set-progress', { detail: 4 }));
      }
    });

    const progressBar = page.getByTestId('progress-bar');
    await progressBar.waitFor({ state: 'attached' });
    await expect(progressBar).toBeVisible();

    const status = page.locator('#session-progress-status');
    const settingsButton = page.getByRole('button', { name: /settings/i });

    await settingsButton.click();
    await page.locator('#settings-popover').waitFor({ state: 'attached' });
    await page.getByTestId('reset-to-preset').waitFor({ state: 'visible' });
    await page.getByTestId('reset-to-preset').click();

    await expect(status).toContainText('Practice data reset.');
    await expect(status).toContainText('0 of 10 trials completed');
    await expect(progressBar).toHaveAttribute('data-progress', '0');
    await expect(page.locator('#toasts .toast', { hasText: 'Practice data reset' })).toBeVisible();

    await page.evaluate(() => window.__setPracticeProgress?.(6));

    await settingsButton.click();
    await page.locator('#settings-popover').waitFor({ state: 'attached' });
    await page.getByTestId('reset-everything').click();
    const confirmDialog = page.getByRole('dialog', { name: /reset practice data\?/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /reset everything/i }).click();

    await expect(status).toContainText('Practice data reset.');
    await expect(status).toContainText('0 of 10 trials completed');
    await expect(progressBar).toHaveAttribute('data-progress', '0');
    await expect(page.locator('#toasts .toast', { hasText: 'Practice data reset' })).toBeVisible();

    await page.evaluate(() => window.__setPracticeProgress?.(7));

    const clearButton = page.getByRole('button', { name: /^clear$/i });
    await clearButton.click();

    await expect(status).toContainText('Trials cleared.');
    await expect(status).toContainText('0 of 10 trials completed');
    await expect(progressBar).toHaveAttribute('data-progress', '0');
    await expect(page.locator('#toasts .toast', { hasText: 'Trials cleared.' })).toBeVisible();
  });
});


