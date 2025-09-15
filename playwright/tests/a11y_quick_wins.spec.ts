import { test, expect } from '@playwright/test';

test('primary CTA has proper focus-visible styles', async ({ page }) => {
  await page.goto('/try');
  
  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  
  // Focus the button
  await startBtn.focus();
  
  // Check that focus-visible styles are applied
  const focusStyles = await startBtn.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return {
      outline: style.outline,
      boxShadow: style.boxShadow,
      border: style.border
    };
  });
  
  // Should have visible focus indicators (at least one)
  const hasFocusIndicator = focusStyles.outline !== 'none' || 
                           focusStyles.boxShadow !== 'none' || 
                           focusStyles.border !== 'none';
  expect(hasFocusIndicator).toBe(true);
});

test('button accessible name includes both Start and Enable microphone', async ({ page }) => {
  await page.goto('/try');
  
  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  const accessibleName = await startBtn.getAttribute('aria-label');
  
  expect(accessibleName).toMatch(/start/i);
  expect(accessibleName).toMatch(/microphone/i);
});

test('pitch meter has proper ARIA label', async ({ page }) => {
  await page.goto('/try');
  
  const pitchMeter = page.locator('.pitch-meter');
  const ariaLabel = await pitchMeter.getAttribute('aria-label');
  
  expect(ariaLabel).toMatch(/audio|level|indicator/i);
});

test('error messages are announced to screen readers', async ({ page }) => {
  await page.goto('/try');
  
  // Check for role="alert" on error messages
  const errorElement = page.locator('[role="alert"]');
  
  // Initially no error, but check the structure exists
  await expect(errorElement).toHaveCount(0);
  
  // The error container should be present in the DOM
  const errorContainer = page.locator('p[role="alert"]');
  await expect(errorContainer).toHaveCount(1);
});
