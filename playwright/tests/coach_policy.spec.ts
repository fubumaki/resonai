import { test, expect } from '@playwright/test';

test.describe('Coach Policy Invariants', () => {
  test('should rate limit hints to 1 per second', async ({ page }) => {
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

  test('should enforce 4s anti-repeat cooldown', async ({ page }) => {
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
    
    // Trigger first hint
    const jitterSlider = page.locator('input[type="range"][data-testid="jitter-slider"]');
    await jitterSlider.fill('0.5');
    await page.waitForTimeout(1000);
    
    // Get first hint
    const firstEmissions = await page.evaluate(() => window.__coachEmits || []);
    expect(firstEmissions.length).toBeGreaterThan(0);
    
    const firstHintId = firstEmissions[0].hintId;
    
    // Try to trigger same hint again immediately
    await jitterSlider.fill('0.6');
    await page.waitForTimeout(500);
    
    // Check that same hint ID wasn't repeated
    const secondEmissions = await page.evaluate(() => window.__coachEmits || []);
    const duplicateHints = secondEmissions.filter(emit => 
      emit.hintId === firstHintId && 
      emit.timestamp > firstEmissions[0].timestamp
    );
    
    expect(duplicateHints).toHaveLength(0);
    
    // Wait for cooldown period and try again
    await page.waitForTimeout(4000);
    await jitterSlider.fill('0.7');
    await page.waitForTimeout(1000);
    
    // Now same hint should be allowed
    const finalEmissions = await page.evaluate(() => window.__coachEmits || []);
    const cooldownExpiredHints = finalEmissions.filter(emit => 
      emit.hintId === firstHintId && 
      emit.timestamp > firstEmissions[0].timestamp + 4000
    );
    
    expect(cooldownExpiredHints.length).toBeGreaterThan(0);
  });

  test('should handle priority swaps at phrase end', async ({ page }) => {
    await page.goto('/coach-simulator?coachhud=1&coach=1&debug=1');
    await page.waitForLoadState('networkidle');
    
    // Check if debug hooks are available
    const hasDebugHooks = await page.evaluate(() => {
      return typeof window.__coachSimulate !== 'undefined';
    });
    
    if (!hasDebugHooks) {
      test.skip(true, 'Debug hooks not available - skipping automated test');
      return;
    }
    
    // Set up hint monitoring
    await page.evaluate(() => {
      window.__coachEmits = [];
    });
    
    // Simulate phrase end with high DTW tier
    await page.evaluate(() => {
      if (window.__coachSimulate) {
        window.__coachSimulate('phraseEnd', { dtwTier: 5, endRiseDetected: true });
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Get emissions
    const emissions = await page.evaluate(() => window.__coachEmits || []);
    
    // Should have praise hint (priority at phrase end)
    const praiseHints = emissions.filter(emit => 
      emit.hintId === 'praise' || emit.text.includes('Lovely')
    );
    
    expect(praiseHints.length).toBeGreaterThan(0);
  });

  test('should maintain rate limiting through tab changes', async ({ page, context }) => {
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
    
    // Trigger first hint
    const jitterSlider = page.locator('input[type="range"][data-testid="jitter-slider"]');
    await jitterSlider.fill('0.5');
    await page.waitForTimeout(1000);
    
    // Switch to another tab
    const newPage = await context.newPage();
    await newPage.goto('about:blank');
    
    // Wait a bit
    await page.waitForTimeout(2000);
    
    // Switch back to original tab
    await page.bringToFront();
    
    // Try to trigger another hint immediately
    await jitterSlider.fill('0.6');
    await page.waitForTimeout(500);
    
    // Check rate limiting still works
    const emissions = await page.evaluate(() => window.__coachEmits || []);
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    const recentHints = emissions.filter(emit => emit.timestamp > oneSecondAgo);
    expect(recentHints.length).toBeLessThanOrEqual(1);
    
    await newPage.close();
  });
});

