import { test, expect } from '@playwright/test';
import { SESSION_RESET_EVENT } from '../../app/practice/events';

test.describe('@flaky Practice Session Reset - Simple', () => {
  test('resets progress and shows friendly toast when reset via settings', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__PRACTICE_TEST__ = true;
    });

    await page.goto('/practice?practiceTest=1');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load and progress elements to be available
    await page.waitForSelector('#session-progress-status', { timeout: 10000 });
    await page.waitForSelector('[role="progressbar"]', { timeout: 10000 });

    // Set initial progress using the test function
    await page.evaluate((value) => {
      if (typeof (window as any).__setPracticeSessionProgress === 'function') {
        (window as any).__setPracticeSessionProgress(value);
      }
    }, 5);

    // Verify initial state
    const status = page.locator('#session-progress-status');
    const progressBar = page.getByRole('progressbar');

    await expect(status).toHaveText(/5 of 10/);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '5');

    // Open settings and reset everything
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForSelector('#settings-popover', { timeout: 5000 });

    // Handle confirmation dialog
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reset everything' }).click();

    // Verify reset state
    await expect(status).toHaveText(/0 of 10/);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0');

    // Verify friendly toast message
    const toast = page.locator('#toasts .toast').last();
    await expect(toast).toHaveText('Session reset. You can start fresh anytime.');

    // Verify toast has proper accessibility attributes
    await expect(toast).toHaveAttribute('role', 'status');
    await expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  test('resets progress and shows friendly toast when reset via export-clear', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__PRACTICE_TEST__ = true;
    });

    await page.goto('/practice?practiceTest=1');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load and progress elements to be available
    await page.waitForSelector('#session-progress-status', { timeout: 10000 });
    await page.waitForSelector('[role="progressbar"]', { timeout: 10000 });

    // Set initial progress using the test function
    await page.evaluate((value) => {
      if (typeof (window as any).__setPracticeSessionProgress === 'function') {
        (window as any).__setPracticeSessionProgress(value);
      }
    }, 7);

    // Verify initial state
    const status = page.locator('#session-progress-status');
    const progressBar = page.getByRole('progressbar');

    await expect(status).toHaveText(/7 of 10/);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '7');

    // Click clear button
    await page.getByRole('button', { name: 'Clear', exact: true }).click();

    // Verify reset state
    await expect(status).toHaveText(/0 of 10/);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0');

    // Verify friendly toast message
    const toast = page.locator('#toasts .toast').last();
    await expect(toast).toHaveText('Session reset. You can start fresh anytime.');

    // Verify toast has proper accessibility attributes
    await expect(toast).toHaveAttribute('role', 'status');
    await expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  test('progress bar uses SVG attributes not inline styles', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__PRACTICE_TEST__ = true;
    });

    await page.goto('/practice?practiceTest=1');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load and progress elements to be available
    await page.waitForSelector('#session-progress-status', { timeout: 10000 });
    await page.waitForSelector('[role="progressbar"]', { timeout: 10000 });

    // Set progress using the test function
    await page.evaluate((value) => {
      if (typeof (window as any).__setPracticeSessionProgress === 'function') {
        (window as any).__setPracticeSessionProgress(value);
      }
    }, 4);

    // Check that progress bar uses SVG attributes, not inline styles
    const meterFill = page.locator('.meter-fill');
    await expect(meterFill).toHaveAttribute('width', '40'); // 4/10 = 40%
    await expect(meterFill).toHaveAttribute('height', '8');

    // Verify no inline styles are used
    const widthStyle = await meterFill.evaluate(el => el.style.width);
    const heightStyle = await meterFill.evaluate(el => el.style.height);
    expect(widthStyle).toBe('');
    expect(heightStyle).toBe('');
  });

  test('ARIA live region announces progress changes', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__PRACTICE_TEST__ = true;
    });

    await page.goto('/practice?practiceTest=1');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load and progress elements to be available
    await page.waitForSelector('#session-progress-status', { timeout: 10000 });

    // Verify ARIA live region has correct attributes
    const status = page.locator('#session-progress-status');
    await expect(status).toHaveAttribute('aria-live', 'polite');

    // Set initial progress
    await page.evaluate((value) => {
      if (typeof (window as any).__setPracticeSessionProgress === 'function') {
        (window as any).__setPracticeSessionProgress(value);
      }
    }, 6);

    // Verify ARIA live region announces the change
    await expect(status).toHaveText(/6 of 10/);

    // Reset progress
    await page.evaluate((value) => {
      if (typeof (window as any).__setPracticeSessionProgress === 'function') {
        (window as any).__setPracticeSessionProgress(value);
      }
    }, 0);

    // Verify ARIA live region announces the reset
    await expect(status).toHaveText(/0 of 10/);
  });
});
