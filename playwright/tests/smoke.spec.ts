import { test, expect } from '@playwright/test';

test('instant practice route loads without errors', async ({ page }) => {
  // Set pilot cohort cookie to access /try route
  await page.context().addCookies([
    {
      name: 'pilot_cohort',
      value: 'pilot',
      domain: 'localhost',
      path: '/',
    }
  ]);
  
  // Set feature flags to enable the feature
  await page.goto('/try');
  await page.evaluate(() => {
    localStorage.setItem('ff.instantPractice', 'true');
    localStorage.setItem('ff.permissionPrimerShort', 'true');
  });
  
  // Reload to apply feature flags
  await page.reload();
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check for Next.js error overlay (should not be present)
  const errorOverlay = page.locator('[data-nextjs-dialog-overlay]');
  await expect(errorOverlay).not.toBeVisible();
  
  // Check that we're still on the /try route (not redirected)
  expect(page.url()).toBe('http://localhost:3003/try');
  
  // Check that the page has some content (not empty)
  const pageContent = await page.content();
  expect(pageContent.length).toBeGreaterThan(1000);
});
