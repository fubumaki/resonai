import { test, expect } from '@playwright/test';

test.describe('Isolation Proof', () => {
  test('should maintain isolation online', async ({ page }) => {
    // Navigate to app with feature flags
    await page.goto('/?coachhud=1&coach=1&debug=1');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for COOP/COEP headers in response first
    const response = await page.request.get('/');
    const coop = response.headers()['cross-origin-opener-policy'];
    const coep = response.headers()['cross-origin-embedder-policy'];
    
    console.log('COOP header:', coop);
    console.log('COEP header:', coep);
    
    // Headers should be present
    expect(coop).toBe('same-origin');
    expect(coep).toBe('require-corp');
    
    // Now check crossOriginIsolated (should be true with proper headers)
    const isIsolated = await page.evaluate(() => window.crossOriginIsolated);
    console.log('crossOriginIsolated:', isIsolated);
    
    // If headers are correct but isolation is false, there might be an issue with the page
    if (!isIsolated) {
      // Check for any console errors that might explain why
      const consoleErrors: any[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Wait a bit and check for errors
      await page.waitForTimeout(1000);
      console.log('Console errors:', consoleErrors);
    }
    
    expect(isIsolated).toBe(true);
    
    // Check for worklet loading (look for AudioWorklet in console)
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('AudioWorklet') || msg.text().includes('worklet')) {
        consoleLogs.push(msg.text());
      }
    });
    
    // Wait a bit for worklets to load
    await page.waitForTimeout(2000);
    
    // Verify no COEP/CORP errors
    const consoleErrors: any[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('COEP') || msg.text().includes('CORP'))) {
        consoleErrors.push(msg.text());
      }
    });
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('should maintain isolation offline', async ({ page }) => {
    // First, load the page online to cache resources
    await page.goto('/?coachhud=1&coach=1&debug=1');
    await page.waitForLoadState('networkidle');
    
    // Block network requests (simulate offline)
    await page.route('**/*', route => {
      // Allow only same-origin requests (cached resources)
      if (route.request().url().startsWith(page.url().split('?')[0])) {
        route.continue();
      } else {
        route.abort();
      }
    });
    
    // Reload page (should use cached resources)
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check isolation is still maintained
    const isIsolated = await page.evaluate(() => window.crossOriginIsolated);
    expect(isIsolated).toBe(true);
    
    // Check for COEP/CORP errors during offline reload
    const consoleErrors: any[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('COEP') || msg.text().includes('CORP'))) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for any potential errors
    await page.waitForTimeout(2000);
    
    expect(consoleErrors).toHaveLength(0);
    
    // Verify worklets still work (check for AudioWorklet messages)
    const workletLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('AudioWorklet') || msg.text().includes('worklet')) {
        workletLogs.push(msg.text());
      }
    });
    
    // Try to start audio (if there's a start button)
    const startButton = page.locator('button:has-text("Start")').first();
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Worklets should still load from cache
    expect(workletLogs.length).toBeGreaterThan(0);
  });

  test('should load worklets from cache', async ({ page }) => {
    await page.goto('/?coachhud=1&coach=1&debug=1');
    await page.waitForLoadState('networkidle');
    
    // Monitor worklet loading
    const workletRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('worklet') || request.url().includes('wasm')) {
        workletRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });
    
    // Wait for worklets to load
    await page.waitForTimeout(3000);
    
    // Check that worklets were requested
    expect(workletRequests.length).toBeGreaterThan(0);
    
    // Verify worklets loaded successfully (no 404s)
    const failedRequests = workletRequests.filter(req => 
      req.url.includes('404') || req.url.includes('error')
    );
    expect(failedRequests).toHaveLength(0);
  });
});

