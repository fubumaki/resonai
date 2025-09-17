import { test, expect } from '@playwright/test';

const RESET_EVENT = 'resonai:session-progress-reset';

async function setProgress(page: import('@playwright/test').Page, value: number): Promise<void> {
  await page.evaluate((progress) => {
    const globals = window as typeof window & {
      __setPracticeProgress?: (amount: number, options?: { totalSteps?: number; announcementPrefix?: string }) => void;
    };
    globals.__setPracticeProgress?.(progress, { totalSteps: 10, announcementPrefix: 'Test run' });
  }, value);
}

async function dispatchReset(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate((eventName) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { reason: 'playwright-reset' } }));
  }, RESET_EVENT);
}

test.describe('practice session reset', () => {
  test('resets progress to defaults', async ({ page }) => {
    await page.goto('/practice');

    const counter = page.getByTestId('progress-count');
    const bar = page.getByTestId('progress-bar').first();
    const status = page.getByTestId('session-progress-status');

    await expect(counter).toHaveText(/0\s*\/\s*10/);
    await expect(bar).toHaveAttribute('data-progress', '0');

    await setProgress(page, 4);
    await expect(counter).toHaveText(/4\s*\/\s*10/);
    await expect(bar).toHaveAttribute('data-progress', '4');

    await dispatchReset(page);

    await expect(counter).toHaveText(/0\s*\/\s*10/);
    await expect(bar).toHaveAttribute('data-progress', '0');
    await expect(status).toContainText(/progress reset/i);
  });
});
