import { test, expect } from '@playwright/test';

test('COOP/COEP headers present and crossOriginIsolated is true', async ({ page, request }) => {
  const res = await request.get('/try');
  const headers = res.headers();
  expect(headers['cross-origin-opener-policy']).toMatch(/same-origin/i);
  expect(headers['cross-origin-embedder-policy']).toMatch(/require-corp/i);

  await page.goto('/try');
  await expect.poll(async () => page.evaluate(() => (window as any).crossOriginIsolated)).toBe(true);
});
