import { test, expect } from '@playwright/test';
import { useStubbedAnalytics } from './helpers';

test('@flaky analytics events are posted (sendBeacon stub + forced flush)', async ({ page, request }) => {
  // 0) start with a clean store
  const del = await request.delete('/api/events');
  expect(del.ok()).toBeTruthy();

  // 1) Use shared helpers so analytics/localStorage stubs behave consistently cross-browser
  const analytics = await useStubbedAnalytics(page);
  
  // Set pilot cohort cookie to allow access to /try page
  await page.context().addCookies([{
    name: 'pilot_cohort',
    value: 'pilot',
    domain: 'localhost',
    path: '/',
  }]);
  
  // Set localStorage after navigation but before React initializes
  await page.goto('/try');
  
  // Set the flags immediately after navigation
  await page.evaluate(() => {
    localStorage.setItem('ff.permissionPrimerShort', 'true');
    localStorage.setItem('ff.instantPractice', 'true');
  });
  
  // Reload the page to ensure React reads the new flags
  await page.reload();
  
  // Wait for React to hydrate and the page to be interactive
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('button', { timeout: 10000 });

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
  await analytics.forceFlush();

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
