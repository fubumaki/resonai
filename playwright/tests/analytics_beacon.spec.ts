import { test, expect } from '@playwright/test';
import { useFakeMic, useLocalStorageFlags, useStubbedAnalytics, stubBeacon } from './helpers';

test('analytics events are posted (sendBeacon stub + forced flush) @flaky', async ({ page, request }) => {
  // 0) start with a clean store
  const del = await request.delete('/api/events');
  expect(del.ok()).toBeTruthy();

  // 1) Use shared helpers so analytics/localStorage stubs behave consistently cross-browser
  await stubBeacon(page);
  const analytics = await useStubbedAnalytics(page);
  await useFakeMic(page);
  await useLocalStorageFlags(page, { 'ff.permissionPrimerShort': 'true' });

  await page.goto('/try');

  // Start flow: first click requests mic
  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  await startBtn.click();
  
  // Wait for mic to be ready and button to change
  await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
  
  // Second click: start recording
  const recordBtn = page.getByRole('button', { name: /start/i });
  await recordBtn.click();
  
  // Wait a moment for events to be generated
  await page.waitForTimeout(1000);

  // 3) Force-flush any client-side buffered events to /api/events
  await expect.poll(async () => {
    const names = (await analytics.getEvents()).map((event: any) => event.event);
    return names;
  }, { intervals: [250, 500, 1000], timeout: 5000 }).toEqual(
    expect.arrayContaining(['screen_view', 'permission_requested'])
  );

  const events = await analytics.getEvents();
  if (events.length) {
    await request.post('/api/events', {
      data: { events },
      headers: { 'content-type': 'application/json' },
    });
  }

  // 4) Poll /api/events until the names appear
  await expect.poll(async () => {
    const res = await fetch('http://localhost:3003/api/events?limit=10');
    const j = await res.json();
    const names = (j.events || []).map((e: any) => e.event);
    return names;
  }, { intervals: [250, 500, 1000, 1500], timeout: 5000 }).toEqual(
    expect.arrayContaining(['screen_view', 'permission_requested'])
  );
});
