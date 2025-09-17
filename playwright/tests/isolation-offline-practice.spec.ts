import { test, expect } from '@playwright/test';

test.describe('Offline isolation regression', () => {
  test('practice reload stays isolated offline with cached COEP assets', async ({ page, context }) => {
    const assetPaths = ['/worklets/lpc-processor.js', '/worklets/pitch-processor.js'];
    const precacheTargets = ['/practice', ...assetPaths];

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    await page.waitForFunction(
      async (paths: string[]) => {
        if (!('serviceWorker' in navigator) || !('caches' in window)) return false;
        const registration = await navigator.serviceWorker.ready;
        if (!registration.active) return false;
        const cache = await caches.open('resonai-v1');
        const origin = location.origin;
        const matches = await Promise.all(
          paths.map((path) => cache.match(new Request(new URL(path, origin).toString()))),
        );
        return matches.every((response) => !!response);
      },
      precacheTargets,
      { timeout: 15_000 },
    );

    await expect.poll(async () => page.evaluate(() => window.crossOriginIsolated)).toBe(true);

    // Use route interception to simulate offline behavior
    await page.route('**/*', route => {
      // Allow same-origin requests (cached resources)
      if (route.request().url().startsWith('http://localhost:3003')) {
        route.continue();
      } else {
        // Block external requests
        route.abort();
      }
    });

    try {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect.poll(async () => page.evaluate(() => window.crossOriginIsolated)).toBe(true);

      const assetChecks = await page.evaluate(async (paths) => {
        const results = [] as Array<{
          path: string;
          ok: boolean;
          status: number;
          coop: string | null;
          coep: string | null;
          error?: string;
        }>;
        for (const path of paths) {
          try {
            const response = await fetch(path);
            results.push({
              path,
              ok: response.ok,
              status: response.status,
              coop: response.headers.get('Cross-Origin-Opener-Policy'),
              coep: response.headers.get('Cross-Origin-Embedder-Policy'),
            });
          } catch (error) {
            results.push({
              path,
              ok: false,
              status: 0,
              coop: null,
              coep: null,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        return results;
      }, assetPaths);

      for (const asset of assetChecks) {
        expect.soft(asset.error, `Failed to fetch ${asset.path} offline`).toBeUndefined();
        expect.soft(asset.ok, `${asset.path} should load from cache`).toBeTruthy();
        expect.soft(asset.status).toBe(200);
        expect.soft(asset.coop).toBe('same-origin');
        expect.soft(asset.coep).toBe('require-corp');
      }
    } finally {
      // Restore normal routing
      await page.unroute('**/*');
    }
  });
});

