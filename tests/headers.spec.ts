import { test, expect } from '@playwright/test';

test('main document has COOP/COEP', async ({ request }) => {
  const res = await request.get('/');
  expect(res.ok()).toBeTruthy();
  const coop = res.headers()['cross-origin-opener-policy'];
  const coep = res.headers()['cross-origin-embedder-policy'];
  expect(coop).toBe('same-origin');
  expect(coep).toBe('require-corp');
});
