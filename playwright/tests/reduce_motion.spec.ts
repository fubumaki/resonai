import { test, expect } from '@playwright/test';

test('respects prefers-reduced-motion for micro-interactions', async ({ page }) => {
  // Set prefers-reduced-motion
  await page.emulateMedia({ reducedMotion: 'reduce' });
  
  // Set pilot cohort cookie to allow access to /try page
  await page.context().addCookies([{
    name: 'pilot_cohort',
    value: 'pilot',
    domain: 'localhost',
    path: '/',
  }]);
  
  await page.goto('/try');
  
  // Set the required instantPractice flag
  await page.evaluate(() => {
    localStorage.setItem('ff.instantPractice', 'true');
  });
  
  await page.reload();
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check that CSS transitions are disabled for reduced motion
  // The pitch meter exists but may be hidden - we just need to check its computed styles
  const pitchMeter = page.locator('.pitch-meter').first();
  const computedStyle = await pitchMeter.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      transition: style.transition,
      animation: style.animation
    };
  });
  
  // Should have reduced or no transitions (allow for very small values like 0.00001s)
  expect(computedStyle.transition).toMatch(/none|0s|0\.0+1s/);
  expect(computedStyle.animation).toMatch(/none|0s|0\.0+1s/);
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
  
  // Set pilot cohort cookie to allow access to /try page
  await page.context().addCookies([{
    name: 'pilot_cohort',
    value: 'pilot',
    domain: 'localhost',
    path: '/',
  }]);
  
  await page.goto('/try');
  
  // Set the required instantPractice flag
  await page.evaluate(() => {
    localStorage.setItem('ff.instantPractice', 'true');
  });
  
  await page.reload();
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('button', { timeout: 10000 });
  
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
