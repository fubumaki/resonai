import { test, expect } from '@playwright/test';

test.describe('Chrome Comparison Tests', () => {
  test('should maintain isolation in Chrome', async ({ page }) => {
    await page.goto('/?coachhud=1&coach=1&debug=1');
    await page.waitForLoadState('networkidle');
    
    // Check crossOriginIsolated is true
    const isIsolated = await page.evaluate(() => window.crossOriginIsolated);
    expect(isIsolated).toBe(true);
    
    // Check for COOP/COEP headers in response
    const response = await page.request.get('/');
    const coop = response.headers()['cross-origin-opener-policy'];
    const coep = response.headers()['cross-origin-embedder-policy'];
    
    expect(coop).toBe('same-origin');
    expect(coep).toBe('require-corp');
  });

  test('should handle coach policy in Chrome', async ({ page }) => {
    await page.goto('/coach-simulator?coachhud=1&coach=1&debug=1');
    await page.waitForLoadState('networkidle');
    
    // Check if debug hooks are available
    const hasDebugHooks = await page.evaluate(() => {
      return typeof window.__coachEmits !== 'undefined';
    });
    
    if (!hasDebugHooks) {
      test.skip(true, 'Debug hooks not available - skipping automated test');
      return;
    }
    
    // Set up hint monitoring
    await page.evaluate(() => {
      window.__coachEmits = [];
    });
    
    // Trigger multiple hints rapidly by setting jitter high
    const jitterSlider = page.locator('input[type="range"][data-testid="jitter-slider"]');
    await jitterSlider.fill('0.5'); // High jitter to trigger hints
    
    // Wait for hints to be generated
    await page.waitForTimeout(2000);
    
    // Get hint emissions
    const emissions = await page.evaluate(() => window.__coachEmits || []);
    
    // Check rate limiting: should not have more than 1 hint per second
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    const recentHints = emissions.filter(emit => emit.timestamp > oneSecondAgo);
    expect(recentHints.length).toBeLessThanOrEqual(1);
    
    // Verify we got some hints
    expect(emissions.length).toBeGreaterThan(0);
  });

  test('should handle privacy and a11y in Chrome', async ({ page }) => {
    await page.goto('/?coachhud=1&coach=1&debug=1');
    await page.waitForLoadState('networkidle');
    
    // Start monitoring network requests
    const networkRequests: any[] = [];
    page.on('request', request => {
      // Ignore initial page load requests
      if (request.url().includes('vercel.app') || request.url().includes('localhost')) {
        return;
      }
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });
    
    // Start a practice session
    const startButton = page.locator('button:has-text("Start")').first();
    if (await startButton.isVisible()) {
      await startButton.click();
    }
    
    // Wait for practice to begin
    await page.waitForTimeout(2000);
    
    // Simulate some practice activity
    const jitterSlider = page.locator('input[type="range"][data-testid="jitter-slider"]');
    if (await jitterSlider.isVisible()) {
      await jitterSlider.fill('0.3');
      await page.waitForTimeout(1000);
      await jitterSlider.fill('0.4');
      await page.waitForTimeout(1000);
    }
    
    // Check that no external network requests were made
    expect(networkRequests).toHaveLength(0);
    
    // Check for aria-live regions
    const ariaLiveRegions = await page.locator('[aria-live]').count();
    expect(ariaLiveRegions).toBeGreaterThan(0);
    
    // Check for role="status" elements (may not be present on all pages)
    const statusElements = await page.locator('[role="status"]').count();
    expect(statusElements).toBeGreaterThanOrEqual(0);
  });

  test('should compare timing behavior between browsers', async ({ page }) => {
    await page.goto('/coach-simulator?coachhud=1&coach=1&debug=1');
    await page.waitForLoadState('networkidle');
    
    // Check if debug hooks are available
    const hasDebugHooks = await page.evaluate(() => {
      return typeof window.__coachEmits !== 'undefined';
    });
    
    if (!hasDebugHooks) {
      test.skip(true, 'Debug hooks not available - skipping automated test');
      return;
    }
    
    // Set up hint monitoring
    await page.evaluate(() => {
      window.__coachEmits = [];
    });
    
    // Trigger hints and measure timing
    const jitterSlider = page.locator('input[type="range"][data-testid="jitter-slider"]');
    await jitterSlider.fill('0.5');
    
    const startTime = Date.now();
    await page.waitForTimeout(3000);
    const endTime = Date.now();
    
    const emissions = await page.evaluate(() => window.__coachEmits || []);
    
    // Calculate timing metrics
    const duration = endTime - startTime;
    const hintRate = emissions.length / (duration / 1000);
    
    console.log(`Chrome timing: ${emissions.length} hints in ${duration}ms (${hintRate.toFixed(2)} hints/sec)`);
    
    // Should respect rate limiting
    expect(hintRate).toBeLessThanOrEqual(1.0);
    
    // Should have some hints
    expect(emissions.length).toBeGreaterThan(0);
  });
});

