import { test, expect } from '@playwright/test';
import { useLocalStorageFlags, useStubbedAnalytics } from './helpers';

test('debug analytics events', async ({ page }) => {
  const analytics = await useStubbedAnalytics(page);
  await useLocalStorageFlags(page, { 'ff.permissionPrimerShort': 'true' });

  await page.goto('/try');
  await page.waitForLoadState('networkidle');

  // Check if analytics is available
  const analyticsAvailable = await page.evaluate(() => {
    return {
      hasAnalytics: !!(window as any).__analytics,
      hasStub: !!(window as any).__ANALYTICS_STUB__,
    };
  });
  console.log('Analytics availability:', analyticsAvailable);

  // Check initial events
  const initialEvents = await analytics.getEvents();
  console.log('Initial events:', initialEvents);

  // Click the button
  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  await startBtn.click();

  // Wait a bit
  await page.waitForTimeout(1000);

  // Check events after click
  const eventsAfterClick = await analytics.getEvents();
  console.log('Events after click:', eventsAfterClick);

  // Force flush
  await analytics.forceFlush();

  // Check events after flush
  const eventsAfterFlush = await analytics.getEvents();
  console.log('Events after flush:', eventsAfterFlush);

  // Check if analytics events are being dispatched
  const eventLogs: string[] = [];
  page.on('console', msg => {
    if (msg.text().includes('analytics') || msg.text().includes('track')) {
      eventLogs.push(msg.text());
    }
  });

  // Wait a bit more and check console logs
  await page.waitForTimeout(2000);
  console.log('Console logs:', eventLogs);
});
