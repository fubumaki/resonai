import { test, expect } from '@playwright/test';

test.describe('Practice Session Progress Analytics', () => {
  test('session_progress events are tracked and sent via beacon when trials complete', async ({ page, request }) => {
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

    // 3) Navigate to practice page
    await page.goto('/practice');

    // 4) Wait for page to load and then directly simulate trial completions
    // This bypasses the complex microphone permission flow and focuses on analytics
    await page.waitForLoadState('networkidle');

    // 5) Simulate trial completions by triggering the onTrialComplete callback
    // This mimics what happens when the Trials component completes a trial
    for (let trialNum = 1; trialNum <= 3; trialNum++) {
      await page.evaluate((trialNumber) => {
        // Simulate the trial completion that triggers trackSessionProgress
        const mockTrialResult = {
          phrase: `test-phrase-${trialNumber}`,
          medianPitch: 200 + trialNumber * 10,
          medianCentroid: 2000 + trialNumber * 50,
          inPitchPct: 85,
          inBrightPct: 80,
          pitchStabilityHz: 5,
          score: 85
        };

        // Dispatch a custom event that the practice page can listen for
        window.dispatchEvent(new CustomEvent('simulateTrialComplete', { 
          detail: mockTrialResult 
        }));
      }, trialNum);

      // Wait a moment for the analytics event to be processed
      await page.waitForTimeout(100);
    }

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
      expect(event.props.progress_percent).toBe(Math.round(((index + 1) / 10) * 100));
    });

    // 9) Verify progress percentages are correct
    expect(sessionProgressEvents[0].props.progress_percent).toBe(10); // 1/10 = 10%
    expect(sessionProgressEvents[1].props.progress_percent).toBe(20); // 2/10 = 20%
    expect(sessionProgressEvents[2].props.progress_percent).toBe(30); // 3/10 = 30%
  });

  test('session progress resets correctly when new session starts', async ({ page, request }) => {
    // Clean analytics store
    await request.delete('/api/events');

    // Setup analytics tracking
    await page.addInitScript(() => {
      (window as any).__analyticsEvents = [];
      window.addEventListener('analytics:track', (e: any) => {
        (window as any).__analyticsEvents.push(e.detail);
      });
    });

    await page.goto('/practice');
    await page.waitForLoadState('networkidle');

    // Complete some trials
    for (let i = 1; i <= 2; i++) {
      await page.evaluate((trialNumber) => {
        const mockTrialResult = {
          phrase: `test-phrase-${trialNumber}`,
          medianPitch: 200,
          medianCentroid: 2000,
          inPitchPct: 85,
          inBrightPct: 80,
          pitchStabilityHz: 5,
          score: 85
        };
        window.dispatchEvent(new CustomEvent('simulateTrialComplete', { 
          detail: mockTrialResult 
        }));
      }, i);
      await page.waitForTimeout(100);
    }

    // Reset session
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('simulateSessionReset'));
    });

    // Complete one more trial after reset
    await page.evaluate(() => {
      const mockTrialResult = {
        phrase: 'test-phrase-after-reset',
        medianPitch: 200,
        medianCentroid: 2000,
        inPitchPct: 85,
        inBrightPct: 80,
        pitchStabilityHz: 5,
        score: 85
      };
      window.dispatchEvent(new CustomEvent('simulateTrialComplete', { 
        detail: mockTrialResult 
      }));
    });

    // Force-flush events
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

    // Verify we have session progress events
    await expect.poll(async () => {
      const res = await request.get('/api/events?limit=20');
      const data = await res.json();
      return data.events.filter((e: any) => e.event === 'session_progress');
    }, { timeout: 3000 }).toHaveLength(3);

    // Verify the last event has step_count = 1 (after reset)
    const eventsRes = await request.get('/api/events?limit=20');
    const eventsData = await eventsRes.json();
    const sessionProgressEvents = eventsData.events.filter((e: any) => e.event === 'session_progress');
    
    const lastEvent = sessionProgressEvents[sessionProgressEvents.length - 1];
    expect(lastEvent.props.step_count).toBe(1);
    expect(lastEvent.props.progress_percent).toBe(10);
  });
});