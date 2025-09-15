import { test, expect } from '@playwright/test';

test.describe('Isolation Proof - Offline Fix', () => {
  test('should maintain isolation offline using context.setOffline', async ({ page }) => {
    // First, load the page online to cache resources
    await page.goto('/?coachhud=1&coach=1&debug=1');
    await page.waitForLoadState('networkidle');
    
    // Check isolation is true online
    const isIsolatedOnline = await page.evaluate(() => window.crossOriginIsolated);
    expect(isIsolatedOnline).toBe(true);
    
    // Set offline mode using context.setOffline (more reliable than request routing)
    await page.context().setOffline(true);
    
    // Reload page (should use cached resources)
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check isolation is still maintained
    const isIsolatedOffline = await page.evaluate(() => window.crossOriginIsolated);
    expect(isIsolatedOffline).toBe(true);
    
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
    
    // Re-enable online mode for cleanup
    await page.context().setOffline(false);
  });

  test('should maintain isolation with request routing (original method)', async ({ page }) => {
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
  });
});

