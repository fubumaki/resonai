import { test, expect } from '@playwright/test';
import { useFakeMic } from './helpers/fakeMic';
import { useStubBeacon } from './helpers/stubBeacon';

test.describe('Practice session reset harness', () => {
  test.beforeEach(async ({ page }) => {
    await useStubBeacon(page);
    await useFakeMic(page);
  });

  test('resets progress counter, live region, and visual bar', async ({ page }) => {
    test.skip(true, 'Enable once practice reset selectors are stable.');

    await page.goto('/practice?practiceTest=1');

    // Prefer UI interactions where feasible; the helper hook is a fallback for deterministic setup.
    await page.evaluate(`window.__setPracticeSessionProgress && window.__setPracticeSessionProgress(5)`);

    await expect(page.getByTestId('progress-count')).toHaveText(/5\s*\/\s*10/i);

    await page.getByRole('button', { name: /reset/i }).click();

    await expect(page.getByTestId('progress-count')).toHaveText(/0\s*\/\s*10/i);
    await expect(page.getByRole('status')).toContainText(/0 of 10 trials completed/i);
    await expect(page.getByTestId('progress-bar')).toHaveAttribute('data-progress', '0');
    await expect(page.getByText(/session reset/i)).toBeVisible();
  });
});
