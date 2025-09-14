import { test, expect } from '@playwright/test';

test('respects prefers-reduced-motion for micro-interactions', async ({ page }) => {
  // Set prefers-reduced-motion
  await page.emulateMedia({ reducedMotion: 'reduce' });
  
  await page.goto('/try');
  
  // Check that CSS transitions are disabled for reduced motion
  const pitchMeter = page.locator('.pitch-meter');
  const computedStyle = await pitchMeter.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      transition: style.transition,
      animation: style.animation
    };
  });
  
  // Should have reduced or no transitions
  expect(computedStyle.transition).toMatch(/none|0s/);
  expect(computedStyle.animation).toMatch(/none|0s/);
});

test('haptics are disabled when reduced motion is preferred', async ({ page }) => {
  // Set prefers-reduced-motion
  await page.emulateMedia({ reducedMotion: 'reduce' });
  
  // Mock navigator.vibrate
  await page.addInitScript(() => {
    let vibrateCalled = false;
    (navigator as any).vibrate = () => { vibrateCalled = true; };
    (window as any).__vibrateCalled = () => vibrateCalled;
  });
  
  await page.goto('/try');
  
  // Trigger mic permission and recording
  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  await startBtn.click();
  
  // Wait for mic to be ready
  await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
  
  // Start recording
  const recordBtn = page.getByRole('button', { name: /start/i });
  await recordBtn.click();
  
  // Check that vibrate was not called due to reduced motion
  const vibrateCalled = await page.evaluate(() => (window as any).__vibrateCalled());
  expect(vibrateCalled).toBe(false);
});
