import { test, expect } from '@playwright/test';
import { useLocalStorageFlags } from './helpers';

test('manual dialog test', async ({ page }) => {
  await useLocalStorageFlags(page, {
    'ff.permissionPrimerShort': 'true',
    'ab:E2': 'A',
  });

  await page.goto('/try');
  await page.waitForLoadState('networkidle');

  // Check feature flags
  const flags = await page.evaluate(() => ({
    primerShort: localStorage.getItem('ff.permissionPrimerShort'),
    e2Variant: localStorage.getItem('ab:E2'),
  }));
  console.log('Feature flags:', flags);

  // Click the button
  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  await startBtn.click();

  // Wait and check what happens
  await page.waitForTimeout(3000);

  // Check for any dialogs
  const dialogCount = await page.locator('[role="dialog"]').count();
  console.log('Dialog count after click:', dialogCount);

  // Check for dialog text
  const micAccessText = await page.locator('text=Microphone Access').count();
  console.log('Microphone Access text count:', micAccessText);

  // Check if the button text changed (indicating mic permission was requested)
  const buttonText = await startBtn.textContent();
  console.log('Button text after click:', buttonText);

  // Check for any console errors
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));

  // Wait a bit more and check console logs
  await page.waitForTimeout(2000);
  console.log('Console logs:', consoleLogs);
});
