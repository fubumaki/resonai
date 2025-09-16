import { test, expect } from '@playwright/test';
import { SESSION_RESET_EVENT } from '../../app/practice/events';

test.describe('@flaky Practice Session Reset', () => {
  test('resets progress and shows friendly toast when reset via settings', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__PRACTICE_TEST__ = true;
    });

    await page.goto('/practice?practiceTest=1');
    await page.waitForLoadState('networkidle');

    // Wait for the practice page to be ready and test functions to be available
    await page.waitForFunction(() => {
      return typeof (window as any).__setPracticeSessionProgress === 'function' &&
        document.getElementById('session-progress-status') !== null;
    }, { timeout: 10000 });

    // Set initial progress to 5/10
    await page.evaluate((value) => {
      (window as any).__setPracticeSessionProgress?.(value);
    }, 5);

    // Verify initial state
    const status = page.locator('#session-progress-status');
    const progressBar = page.getByRole('progressbar');

    await expect(status).toHaveText(/5 of 10/);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '5');

    // Open settings and reset everything
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForSelector('#settings-popover');

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

    // Wait for the practice page to be ready and test functions to be available
    await page.waitForFunction(() => {
      return typeof (window as any).__setPracticeSessionProgress === 'function' &&
        document.getElementById('session-progress-status') !== null;
    }, { timeout: 10000 });

    // Set initial progress to 7/10
    await page.evaluate((value) => {
      (window as any).__setPracticeSessionProgress?.(value);
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

  test('resets progress when SESSION_RESET_EVENT is dispatched programmatically', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__PRACTICE_TEST__ = true;
    });

    await page.goto('/practice?practiceTest=1');
    await page.waitForLoadState('networkidle');

    // Wait for the practice page to be ready and test functions to be available
    await page.waitForFunction(() => {
      return typeof (window as any).__setPracticeSessionProgress === 'function' &&
        document.getElementById('session-progress-status') !== null;
    }, { timeout: 10000 });

    // Set initial progress to 3/10
    await page.evaluate((value) => {
      (window as any).__setPracticeSessionProgress?.(value);
    }, 3);

    // Verify initial state
    const status = page.locator('#session-progress-status');
    const progressBar = page.getByRole('progressbar');

    await expect(status).toHaveText(/3 of 10/);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '3');

    // Dispatch reset event programmatically
    await page.evaluate((eventName) => {
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: { source: 'programmatic-reset' }
      }));
    }, SESSION_RESET_EVENT);

    // Verify reset state
    await expect(status).toHaveText(/0 of 10/);
    await expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  test('progress bar uses SVG attributes not inline styles', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__PRACTICE_TEST__ = true;
    });

    await page.goto('/practice?practiceTest=1');
    await page.waitForLoadState('networkidle');

    // Wait for the practice page to be ready and test functions to be available
    await page.waitForFunction(() => {
      return typeof (window as any).__setPracticeSessionProgress === 'function' &&
        document.getElementById('session-progress-status') !== null;
    }, { timeout: 10000 });

    // Set progress to 4/10
    await page.evaluate((value) => {
      (window as any).__setPracticeSessionProgress?.(value);
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

  test('toast respects reduced motion preference', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.addInitScript(() => {
      (window as any).__PRACTICE_TEST__ = true;
    });

    await page.goto('/practice?practiceTest=1');
    await page.waitForLoadState('networkidle');

    // Wait for the practice page to be ready
    await page.waitForFunction(() => {
      return document.getElementById('session-progress-status') !== null;
    }, { timeout: 10000 });

    // Trigger a reset to show toast
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForSelector('#settings-popover');

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reset everything' }).click();

    // Verify toast appears (should not have transition in reduced motion)
    const toast = page.locator('#toasts .toast').last();
    await expect(toast).toHaveText('Session reset. You can start fresh anytime.');

    // Check that toast doesn't have transition styles when reduced motion is enabled
    const computedStyle = await toast.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        transition: styles.transition,
        opacity: styles.opacity
      };
    });

    // In reduced motion mode, transition should be 'none' or empty
    expect(computedStyle.transition).toBe('none');
  });

  test('ARIA live region announces progress changes', async ({ page }) => {
    await page.addInitScript(() => {
      (window as any).__PRACTICE_TEST__ = true;
    });

    await page.goto('/practice?practiceTest=1');
    await page.waitForLoadState('networkidle');

    // Wait for the practice page to be ready and test functions to be available
    await page.waitForFunction(() => {
      return typeof (window as any).__setPracticeSessionProgress === 'function' &&
        document.getElementById('session-progress-status') !== null;
    }, { timeout: 10000 });

    // Set initial progress
    await page.evaluate((value) => {
      (window as any).__setPracticeSessionProgress?.(value);
    }, 6);

    // Verify ARIA live region has correct attributes
    const status = page.locator('#session-progress-status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveText(/6 of 10/);

    // Reset progress
    await page.evaluate((value) => {
      (window as any).__setPracticeSessionProgress?.(value);
    }, 0);

    // Verify ARIA live region announces the change
    await expect(status).toHaveText(/0 of 10/);
  });
});
