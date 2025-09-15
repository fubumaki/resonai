import { test, expect } from '@playwright/test';

test('events endpoint accepts and returns recent events', async ({ request }) => {
  // Post a couple of synthetic events
  const payload = {
    events: [
      { event: 'ttv_measured', props: { ms: 1234 }, session_id: 's-1' },
      { event: 'mic_session_start', props: {}, session_id: 's-1' },
      { event: 'mic_session_end', props: {}, session_id: 's-1' },
    ],
  };
  const post = await request.post('/api/events', { data: payload, headers: { 'content-type': 'application/json' } });
  expect(post.ok()).toBeTruthy();
  const posted = await post.json();
  expect(posted?.count).toBe(3);

  // Read back the latest 3
  const res = await request.get('/api/events?limit=3');
  expect(res.ok()).toBeTruthy();
  const { events } = await res.json();
  expect(Array.isArray(events)).toBe(true);
  const names = events.map((e: any) => e.event);
  // The last three should include the ones we posted (order may be FIFO; we only assert inclusion)
  expect(names).toEqual(expect.arrayContaining(['ttv_measured', 'mic_session_start', 'mic_session_end']));
});
