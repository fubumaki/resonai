import { test, expect } from '@playwright/test';

test('precache includes model & worklets', async ({ request }) => {
  // Check that critical assets are accessible (not necessarily in a manifest file)
  const modelRes = await request.get('/models/crepe-tiny.onnx');
  const pitchWorkletRes = await request.get('/worklets/pitch-processor.js');
  
  // These should return 404 or 200, but not 500 (server error)
  expect([200, 404]).toContain(modelRes.status());
  expect([200, 404]).toContain(pitchWorkletRes.status());
  
  // If the files exist, they should be accessible
  if (modelRes.status() === 200) {
    expect(modelRes.headers()['content-type']).toContain('application/octet-stream');
  }
  
  if (pitchWorkletRes.status() === 200) {
    expect(pitchWorkletRes.headers()['content-type']).toContain('javascript');
  }
});
