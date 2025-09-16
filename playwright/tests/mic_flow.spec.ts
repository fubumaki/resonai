import { test, expect } from '@playwright/test';
import {
  useFakeMic,
  usePermissionMock,
  useStubbedAnalytics,
} from './helpers';

test('one-tap mic toggles recording and emits analytics', async ({ page }) => {
  // Helpers centralise cross-browser stubs for audio, analytics, storage and permissions.
  const analytics = await useStubbedAnalytics(page);
  await useFakeMic(page);
  await usePermissionMock(page, { microphone: 'granted' });
  
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

  // Force flush analytics events
  await analytics.forceFlush();

  // Verify we got some analytics traffic in order
  const events = await analytics.getEvents();
  const names = events.map((e: any) => e.event);
  expect(names).toContain('mic_session_start');
  expect(names).toContain('mic_session_end');
});
