import { test, expect } from '@playwright/test';

test.describe('Practice Session Progress Analytics', () => {
  test('session_progress events are tracked when trackSessionProgress is called directly', async ({ page, request }) => {
    // 0) Clean analytics store
    const del = await request.delete('/api/events');
    expect(del.ok()).toBeTruthy();

    // 1) Navigate to practice page to load the analytics module
    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // 2) Wait for session progress helpers to be attached (test-only)
    await page.waitForFunction(() =>
      typeof window.__resetSessionProgress === 'function' &&
      typeof window.__getSessionProgress === 'function' &&
      typeof window.__trackSessionProgress === 'function'
    );

    // 3) Use the helpers to record deterministic session progress events
    await page.evaluate(() => {
      window.__resetSessionProgress?.();
      window.__trackSessionProgress?.(1, 10);
      window.__trackSessionProgress?.(2, 10);
      window.__trackSessionProgress?.(3, 10);
    });

    // 4) Retrieve the captured events via the helper API
    const sessionProgressEvents = await page.evaluate(() => window.__getSessionProgress?.() ?? []);

    expect(sessionProgressEvents).toHaveLength(3);

    sessionProgressEvents.forEach((event: any, index: number) => {
      expect(event.event).toBe('session_progress');
      expect(event.props).toHaveProperty('step_count');
      expect(event.props).toHaveProperty('total_steps');
      expect(event.props).toHaveProperty('progress_percent');
      expect(event.props.step_count).toBe(index + 1);
      expect(event.props.total_steps).toBe(10);
      expect(event.props.progress_percent).toBe((index + 1) * 10);
    });

    // 5) Verify progress percentages are correct
    expect(sessionProgressEvents[0].props.progress_percent).toBe(10); // 1/10 = 10%
    expect(sessionProgressEvents[1].props.progress_percent).toBe(20); // 2/10 = 20%
    expect(sessionProgressEvents[2].props.progress_percent).toBe(30); // 3/10 = 30%

    // 6) Submit the captured events to the analytics API and ensure they persist
    const post = await request.post('/api/events', {
      data: { events: sessionProgressEvents },
      headers: { 'content-type': 'application/json' }
    });
    expect(post.ok()).toBeTruthy();

    const eventsRes = await request.get('/api/events?limit=10');
    const eventsData = await eventsRes.json();
    const storedSessionProgressEvents = eventsData.events.filter((e: any) => e.event === 'session_progress');
    expect(storedSessionProgressEvents).toHaveLength(3);

    storedSessionProgressEvents.forEach((event: any, index: number) => {
      expect(event.props.step_count).toBe(index + 1);
      expect(event.props.total_steps).toBe(10);
      expect(event.props.progress_percent).toBe((index + 1) * 10);
    });
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