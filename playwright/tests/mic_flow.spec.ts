import { test, expect } from '@playwright/test';
import { useFakeMic } from './helpers/fakeMic';

test('one-tap mic toggles recording and emits analytics', async ({ page }) => {
  // Capture analytics events emitted via CustomEvent('analytics:track', {detail})
  await page.addInitScript(() => {
    (window as any).__events = [];
    window.addEventListener('analytics:track', (e: any) => {
      (window as any).__events.push(e.detail);
    });
  });

  await useFakeMic(page);
  await page.goto('/try');

  // First click: request mic permission
  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // Wait for mic to be ready and button to change to recording button
  await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
  
  // Second click: start recording
  const recordBtn = page.getByRole('button', { name: /start/i });
  await recordBtn.click();

  // The UI should reflect "recording" state (example uses data-active on a pitch meter)
  const meter = page.locator('.pitch-meter');
  await expect(meter).toHaveAttribute('data-active', 'true');

  // Stop - button text changes to "Stop" when recording
  const stopBtn = page.getByRole('button', { name: /stop/i });
  await stopBtn.click();
  await expect(meter).toHaveAttribute('data-active', 'false');

  // Verify we got some analytics traffic in order
  const events = await page.evaluate(() => (window as any).__events);
  const names = events.map((e: any) => e.event);
  expect(names).toContain('mic_session_start');
  expect(names).toContain('mic_session_end');
});
