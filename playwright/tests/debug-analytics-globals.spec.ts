import { test, expect } from '@playwright/test';

test('debug analytics globals and hook into sendBeacon', async ({ page }) => {
  // Set pilot cohort cookie to allow access to /try page
  await page.context().addCookies([{
    name: 'pilot_cohort',
    value: 'pilot',
    domain: 'localhost',
    path: '/',
  }]);

  // Hook into analytics before any page scripts run
  await page.addInitScript(() => {
    window.__capturedEvents = [];
    window.__analyticsDebug = {
      sendBeaconCalls: [],
      customEvents: [],
    };

    // Wrap sendBeacon to capture events
    const originalSendBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string, data?: BodyInit | null) => {
      console.log('sendBeacon called:', { url, data });
      window.__analyticsDebug.sendBeaconCalls.push({ url, data });
      
      if (data) {
        try {
          const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
          const parsed = JSON.parse(text);
          window.__capturedEvents.push(parsed);
          console.log('Captured analytics event:', parsed);
        } catch (e) {
          console.log('Failed to parse sendBeacon data:', e);
        }
      }
      
      return originalSendBeacon(url, data);
    };

    // Listen for analytics custom events
    window.addEventListener('analytics:track', (event: any) => {
      console.log('analytics:track event:', event.detail);
      window.__analyticsDebug.customEvents.push(event.detail);
    });
  });

  // Navigate to /try page
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

  // Check global scope for analytics functions
  const globalScope = await page.evaluate(() => {
    return {
      hasAnalytics: !!(window as any).__analytics,
      hasTrackScreenView: typeof (window as any).trackScreenView,
      hasSendBeacon: typeof navigator.sendBeacon,
      hasCustomEvents: window.__analyticsDebug?.customEvents?.length || 0,
      hasSendBeaconCalls: window.__analyticsDebug?.sendBeaconCalls?.length || 0,
    };
  });
  console.log('Global scope check:', globalScope);

  // Check if analytics module is loaded by looking for the singleton
  const analyticsModule = await page.evaluate(() => {
    // Try to access the analytics module through various means
    const checks = {
      windowAnalytics: !!(window as any).__analytics,
      trackScreenViewGlobal: typeof (window as any).trackScreenView,
      navigatorSendBeacon: typeof navigator.sendBeacon,
      customEventListeners: window.__analyticsDebug?.customEvents?.length || 0,
    };
    
    // Try to find analytics in the global scope
    const globalKeys = Object.keys(window).filter(key => 
      key.includes('analytics') || key.includes('track') || key.includes('Analytics')
    );
    
    return { ...checks, globalKeys };
  });
  console.log('Analytics module check:', analyticsModule);

  // Click the button to trigger analytics
  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  await startBtn.click();
  
  // Wait for any async operations
  await page.waitForTimeout(2000);

  // Check what was captured
  const capturedData = await page.evaluate(() => {
    return {
      capturedEvents: window.__capturedEvents,
      sendBeaconCalls: window.__analyticsDebug?.sendBeaconCalls || [],
      customEvents: window.__analyticsDebug?.customEvents || [],
    };
  });
  console.log('Captured analytics data:', capturedData);

  // Check console logs for any analytics activity
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    if (msg.text().includes('analytics') || msg.text().includes('track') || msg.text().includes('sendBeacon')) {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  // Wait a bit more and check console logs
  await page.waitForTimeout(2000);
  console.log('Analytics console logs:', consoleLogs);
});
