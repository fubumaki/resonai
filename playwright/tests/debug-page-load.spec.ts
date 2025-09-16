import { test, expect } from '@playwright/test';

test('debug page load and console', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  await page.goto('/try');
  await page.waitForLoadState('networkidle');

  // Wait a bit for any async operations
  await page.waitForTimeout(2000);

  console.log('Console logs:', consoleLogs);

  // Check if the page loaded correctly
  const title = await page.title();
  console.log('Page title:', title);

  // Check if there are any JavaScript errors
  const errors = consoleLogs.filter(log => log.includes('[error]'));
  console.log('JavaScript errors:', errors);

  // Check if analytics is available
  const analyticsCheck = await page.evaluate(() => {
    return {
      hasAnalytics: !!(window as any).__analytics,
      hasStub: !!(window as any).__ANALYTICS_STUB__,
      hasTrackScreenView: typeof (window as any).trackScreenView,
    };
  });
  console.log('Analytics check:', analyticsCheck);
});
