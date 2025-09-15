import { test, expect } from '@playwright/test';

test.describe('@a11y', () => {
  test('Landing has 0 axe violations (if axe available)', async ({ page }) => {
    await page.goto('/');
    // Attempt dynamic import so this test can run even if axe-core/playwright is not installed.
    let AxeBuilder: any;
    try {
      AxeBuilder = (await import('@axe-core/playwright')).default;
    } catch {
      test.skip(true, 'axe-core/playwright not installed');
      return;
    }
    const builder = new AxeBuilder({ page });
    const results = await builder.analyze();
    expect(results.violations).toEqual([]);
  });
});
