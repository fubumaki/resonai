import { test, expect } from '@playwright/test';

test('COOP/COEP headers present and crossOriginIsolated persists online/offline', async ({ page, request, context }) => {
  for (const path of ['/', '/try']) {
    const res = await request.get(path);
    const headers = res.headers();
    expect(headers['cross-origin-opener-policy']).toMatch(/same-origin/i);
    expect(headers['cross-origin-embedder-policy']).toMatch(/require-corp/i);
  }

  await page.goto('/try');
  await expect.poll(async () => page.evaluate(() => (window as any).crossOriginIsolated)).toBe(true);

  // Wait until the service worker is active so cached navigations keep COOP/COEP headers intact
  await expect.poll(async () => page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    return Boolean(reg?.active);
  })).toBe(true);

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(async () => page.evaluate(() => (window as any).crossOriginIsolated)).toBe(true);
  } finally {
    await context.setOffline(false);
  }
});