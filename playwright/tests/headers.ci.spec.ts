import { test, expect } from '@playwright/test';

test('Practice route is crossOriginIsolated and has COOP/COEP', async ({ page, request }) => {
  await page.goto('/practice');
  const isIso = await page.evaluate(() => (self as any).crossOriginIsolated === true);
  expect(isIso).toBe(true);
  const res = await request.get('/practice');
  const coop = res.headers()['cross-origin-opener-policy'];
  const coep = res.headers()['cross-origin-embedder-policy'];
  expect(coop?.toLowerCase()).toContain('same-origin');
  expect(coep?.toLowerCase()).toContain('require-corp');
});

