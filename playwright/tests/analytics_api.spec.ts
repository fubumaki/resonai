import { test, expect } from '@playwright/test';

test('events endpoint accepts and returns recent events', async ({ request }) => {
  await request.delete('/api/events');
  const payload = {
    events: [
      { event: 'ttv_measured', props: { ms: 1234 }, session_id: 's-1' },
      { event: 'mic_session_start', props: {}, session_id: 's-1' },
      { event: 'mic_session_end', props: {}, session_id: 's-1' },
    ],
  };
  const post = await request.post('/api/events', {
    data: payload, headers: { 'content-type': 'application/json' }
  });
  expect(post.ok()).toBeTruthy();

  const res = await request.get('/api/events?limit=3');
  expect(res.ok()).toBeTruthy();
  const { events } = await res.json();
  const names = events.map((e: any) => e.event);
  expect(names).toEqual(expect.arrayContaining(['ttv_measured', 'mic_session_start', 'mic_session_end']));
});
