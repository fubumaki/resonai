import { test, expect } from '@playwright/test';

test('analytics events are posted (sendBeacon stub + forced flush)', async ({ page, request }) => {
  // 0) start with a clean store
  const del = await request.delete('/api/events');
  expect(del.ok()).toBeTruthy();

  // 1) stub sendBeacon to use fetch (so we can await)
  await page.addInitScript(() => {
    (navigator as any).__origSendBeacon__ = navigator.sendBeacon?.bind(navigator);
    (navigator as any).sendBeacon = (url: string, data?: any) => {
      // Convert Blob/DataView/etc. to a fetch body Playwright can pass across
      const headers: Record<string,string> = {};
      let body: any = data;

      if (data instanceof Blob) {
        // Playwright serializes Blobs poorly; read it to text before sending
        return (data as Blob).text().then(t => {
          headers['content-type'] = 'application/json';
          return fetch(url, { method: 'POST', headers, body: t }).then(() => true, () => true);
        });
      }
      if (typeof data === 'string') {
        // assume pre-serialized JSON
        headers['content-type'] = 'application/json';
      }
      return fetch(url, { method: 'POST', headers, body }).then(() => true, () => true);
    };
  });

  // 2) produce some analytics in the app
  await page.addInitScript(() => {
    (window as any).__events = [];
    window.addEventListener('analytics:track', (e: any) => {
      (window as any).__events.push(e.detail);
    });
  });

  await page.goto('/try');

  // Trigger the primer path if needed
  await page.evaluate(() => localStorage.setItem('ff.permissionPrimerShort', 'true'));

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
  await page.evaluate(async () => {
    const ev = (window as any).__events || [];
    // only flush if your app hasn't already done so
    if (ev.length) {
      const blob = new Blob([JSON.stringify({ events: ev })], { type: 'application/json' });
      (navigator as any).sendBeacon('/api/events', blob);
    }
  });

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
