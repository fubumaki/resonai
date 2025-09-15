import { test, expect } from '@playwright/test';

test('Flow JSON v1 loads and is sane', async ({ page }) => {
  const res = await page.request.get('/flows/daily_v1.json');
  expect(res.ok()).toBeTruthy();
  const j = await res.json();
  expect(j.version).toBe(1);
  expect(Array.isArray(j.steps)).toBeTruthy();
  const ids = new Set(j.steps.map((s: any) => s.id));
  expect(ids.has('onboarding') && ids.has('warmup') && ids.has('glide') && ids.has('phrase') && ids.has('reflection')).toBeTruthy();
});
