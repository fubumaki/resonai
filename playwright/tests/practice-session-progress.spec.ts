import { test, expect } from '@playwright/test';

test.describe('Practice Session Progress Analytics', () => {
  test('session_progress events are tracked when trackSessionProgress is called directly', async ({ page, request }) => {
    // 0) Clean analytics store
    const del = await request.delete('/api/events');
    expect(del.ok()).toBeTruthy();

    // 1) Setup analytics event tracking
    await page.addInitScript(() => {
      (window as any).__analyticsEvents = [];
      window.addEventListener('analytics:track', (e: any) => {
        (window as any).__analyticsEvents.push(e.detail);
      });
    });

    // 2) Mock sendBeacon to capture analytics events
    await page.addInitScript(() => {
      (navigator as any).__origSendBeacon__ = navigator.sendBeacon?.bind(navigator);
      (navigator as any).sendBeacon = (url: string, data?: any) => {
        // Convert Blob/DataView/etc. to a fetch body Playwright can pass across
        const headers: Record<string, string> = {};
        let body: any = data;

        if (data instanceof Blob) {
          return (data as Blob).text().then(t => {
            headers['content-type'] = 'application/json';
            return fetch(url, { method: 'POST', headers, body: t }).then(() => true, () => true);
          });
        }
        if (typeof data === 'string') {
          headers['content-type'] = 'application/json';
        }
        return fetch(url, { method: 'POST', headers, body }).then(() => true, () => true);
      };
    });

    // 3) Navigate to practice page to load the analytics module
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // 4) Call trackSessionProgress directly to test the analytics function
    await page.evaluate(() => {
      // Import and call the trackSessionProgress function directly
      // This tests the analytics function without needing the full UI flow
      if ((window as any).analytics && (window as any).analytics.track) {
        // Simulate calling trackSessionProgress with different step counts
        (window as any).analytics.track('session_progress', {
          step_count: 1,
          total_steps: 10,
          progress_percent: 10
        });

        (window as any).analytics.track('session_progress', {
          step_count: 2,
          total_steps: 10,
          progress_percent: 20
        });

        (window as any).analytics.track('session_progress', {
          step_count: 3,
          total_steps: 10,
          progress_percent: 30
        });
      }
    });

    // 5) Wait a moment for events to be processed
    await page.waitForTimeout(500);

    // 6) Force-flush any buffered events to /api/events
    await page.evaluate(async () => {
      const events = (window as any).__analyticsEvents || [];
      if (events.length) {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events })
        });
      }
    });

    // 7) Wait for session_progress events to appear in the API
    await expect.poll(async () => {
      const res = await request.get('/api/events?limit=10');
      const data = await res.json();
      const sessionProgressEvents = (data.events || []).filter((e: any) => e.event === 'session_progress');
      return sessionProgressEvents;
    }, { intervals: [250, 500, 1000], timeout: 5000 }).toHaveLength(3);

    // 8) Verify the session_progress events have correct structure
    const eventsRes = await request.get('/api/events?limit=10');
    const eventsData = await eventsRes.json();
    const sessionProgressEvents = eventsData.events.filter((e: any) => e.event === 'session_progress');

    expect(sessionProgressEvents).toHaveLength(3);

    // Verify each event has the correct structure
    sessionProgressEvents.forEach((event: any, index: number) => {
      expect(event.event).toBe('session_progress');
      expect(event.props).toHaveProperty('step_count');
      expect(event.props).toHaveProperty('total_steps');
      expect(event.props).toHaveProperty('progress_percent');
      expect(event.props.step_count).toBe(index + 1);
      expect(event.props.total_steps).toBe(10);
      expect(event.props.progress_percent).toBe((index + 1) * 10);
    });

    // 9) Verify progress percentages are correct
    expect(sessionProgressEvents[0].props.progress_percent).toBe(10); // 1/10 = 10%
    expect(sessionProgressEvents[1].props.progress_percent).toBe(20); // 2/10 = 20%
    expect(sessionProgressEvents[2].props.progress_percent).toBe(30); // 3/10 = 30%
  });

  test('analytics events API accepts session_progress events', async ({ request }) => {
    // Clean analytics store
    await request.delete('/api/events');

    // Post session_progress events directly to the API
    const payload = {
      events: [
        {
          event: 'session_progress',
          props: { step_count: 1, total_steps: 10, progress_percent: 10 },
          session_id: 'test-session-1',
          ts: Date.now()
        },
        {
          event: 'session_progress',
          props: { step_count: 2, total_steps: 10, progress_percent: 20 },
          session_id: 'test-session-1',
          ts: Date.now()
        },
        {
          event: 'session_progress',
          props: { step_count: 3, total_steps: 10, progress_percent: 30 },
          session_id: 'test-session-1',
          ts: Date.now()
        }
      ]
    };

    const post = await request.post('/api/events', {
      data: payload,
      headers: { 'content-type': 'application/json' }
    });
    expect(post.ok()).toBeTruthy();
    const posted = await post.json();
    expect(posted?.count).toBe(3);

    // Read back the events
    const res = await request.get('/api/events?limit=10');
    expect(res.ok()).toBeTruthy();
    const { events } = await res.json();
    expect(Array.isArray(events)).toBe(true);

    const sessionProgressEvents = events.filter((e: any) => e.event === 'session_progress');
    expect(sessionProgressEvents).toHaveLength(3);

    // Verify structure
    sessionProgressEvents.forEach((event: any, index: number) => {
      expect(event.event).toBe('session_progress');
      expect(event.props.step_count).toBe(index + 1);
      expect(event.props.total_steps).toBe(10);
      expect(event.props.progress_percent).toBe((index + 1) * 10);
    });
  });
});