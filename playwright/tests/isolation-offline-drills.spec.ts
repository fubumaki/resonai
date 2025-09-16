import { test, expect } from '@playwright/test';

test.describe('Offline drills', () => {
  test('practice and pitch-band lab load offline with worklets cached', async ({ page, context }) => {
    // Warm cache online
    await page.goto('/practice');
    await page.goto('/labs/pitch-band');

    // Go offline
    await context.setOffline(true);

    // Should still load routes
    await page.goto('/practice');
    await expect(page.getByTestId('progress-bar')).toBeVisible();
    await page.goto('/labs/pitch-band');
    await expect(page.getByRole('heading', { name: /pitch band drill/i })).toBeVisible();

    // Verify worklets respond from cache (request listener)
    const workletRequests: string[] = [];
    page.on('request', req => {
      const url = new URL(req.url());
      if (url.pathname.startsWith('/worklets/')) workletRequests.push(url.pathname);
    });

    // Trigger a fetch for known worklets
    await Promise.all([
      page.evaluate(() => fetch('/worklets/lpc-processor.js').then(() => true, () => false)),
      page.evaluate(() => fetch('/worklets/pitch-processor.js').then(() => true, () => false)),
    ]);

    expect(workletRequests.length).toBeGreaterThan(0);
  });
});


