import { test, expect } from '@playwright/test';

test.describe('@flaky Practice Session Reset - Basic', () => {
  test('shows friendly toast message when reset via settings', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await page.waitForSelector('#session-progress-status', { timeout: 10000 });

    // Open settings and reset everything
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForSelector('#settings-popover', { timeout: 5000 });

    // Handle confirmation dialog
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reset everything' }).click();

    // Verify friendly toast message appears
    const toast = page.locator('#toasts .toast').last();
    await expect(toast).toHaveText('Session reset. You can start fresh anytime.');

    // Verify toast has proper accessibility attributes
    await expect(toast).toHaveAttribute('role', 'status');
    await expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  test('shows friendly toast message when reset via export-clear', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await page.waitForSelector('#session-progress-status', { timeout: 10000 });

    // Click clear button
    await page.getByRole('button', { name: 'Clear', exact: true }).click();

    // Verify friendly toast message appears
    const toast = page.locator('#toasts .toast').last();
    await expect(toast).toHaveText('Session reset. You can start fresh anytime.');

    // Verify toast has proper accessibility attributes
    await expect(toast).toHaveAttribute('role', 'status');
    await expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  test('progress bar uses SVG attributes not inline styles', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await page.waitForSelector('[role="progressbar"]', { timeout: 10000 });

    // Check that progress bar uses SVG attributes, not inline styles
    const meterFill = page.locator('.meter-fill');

    // Verify no inline styles are used
    const widthStyle = await meterFill.evaluate(el => el.style.width);
    const heightStyle = await meterFill.evaluate(el => el.style.height);
    expect(widthStyle).toBe('');
    expect(heightStyle).toBe('');

    // Verify SVG attributes are used instead
    await expect(meterFill).toHaveAttribute('width');
    await expect(meterFill).toHaveAttribute('height', '8');
  });

  test('ARIA live region has correct attributes', async ({ page }) => {
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await page.waitForSelector('#session-progress-status', { timeout: 10000 });

    // Verify ARIA live region has correct attributes
    const status = page.locator('#session-progress-status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveText(/Practice session progress: \d+ of 10 trials completed/);
  });

  test('toast respects reduced motion preference', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Wait for the page to load
    await page.waitForSelector('#session-progress-status', { timeout: 10000 });

    // Trigger a reset to show toast
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.waitForSelector('#settings-popover', { timeout: 5000 });

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Reset everything' }).click();

    // Verify toast appears
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
});
