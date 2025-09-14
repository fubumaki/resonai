import { test, expect } from '@playwright/test';

test('healthz returns 200', async ({ request }) => {
  const res = await request.get('/api/healthz');
  expect(res.ok()).toBeTruthy();
  expect(await res.text()).toMatch(/ok/i);
});
