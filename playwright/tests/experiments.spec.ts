import { test, expect } from '@playwright/test';
import {
  useFakeMic,
  useLocalStorageFlags,
  usePermissionMock,
  useStubbedAnalytics,
} from './helpers';
import type { AnalyticsStub, LocalStorageController } from './helpers';

test.describe('Experiments', () => {
  test.describe.configure({ mode: 'serial' }); // variant persistence relies on localStorage
  let storage: LocalStorageController;
  let analytics: AnalyticsStub;

  test.beforeEach(async ({ page }) => {
    storage = await useLocalStorageFlags(page);
    analytics = await useStubbedAnalytics(page);
    await useFakeMic(page);
    await usePermissionMock(page, { microphone: 'granted' });

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
    
    await storage.clear();
    await analytics.reset();
  });

  test('E1/E2 variants assign once and persist across reload', async ({ page }) => {
    // Bootstrap a clean bucket
    await page.context().clearCookies();
    
    // Re-add the pilot cohort cookie after clearing
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

    // Read variant keys *set by your app code* (ab:E1, ab:E2)
    const variants = await page.evaluate(() => ({
      E1: localStorage.getItem('ab:E1'),
      E2: localStorage.getItem('ab:E2')
    }));

    expect(variants.E1 === 'A' || variants.E1 === 'B').toBeTruthy();
    expect(variants.E2 === 'A' || variants.E2 === 'B').toBeTruthy();

    // Reload and ensure *no reassignment*
    await page.reload();
    const variants2 = await page.evaluate(() => ({
      E1: localStorage.getItem('ab:E1'),
      E2: localStorage.getItem('ab:E2')
    }));

    expect(variants2.E1).toBe(variants.E1);
    expect(variants2.E2).toBe(variants.E2);
  });


  test('should show primer dialog for E2A variant', async ({ page }) => {
    // Force E2A variant
    await storage.set({
      'ab:E2': 'A',
      'ff.permissionPrimerShort': 'true',
    });

    await page.reload();

    // Click the mic button
    await page.click('button:has-text("Start with voice")');
    
    // Check that primer dialog appears
    const dialog = page.locator('dialog[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Check dialog content
    await expect(dialog.locator('h2')).toContainText('Microphone Access');
    await expect(dialog.locator('p').first()).toContainText('We use your mic to give you instant feedback');
    
    // Check buttons
    await expect(dialog.locator('button:has-text("Not now")')).toBeVisible();
    await expect(dialog.locator('button:has-text("Continue")')).toBeVisible();
  });

  test('should skip primer dialog for E2B variant', async ({ page }) => {
    // Force E2B variant
    await storage.set({
      'ab:E2': 'B',
      'ff.permissionPrimerShort': 'true',
    });

    await page.reload();

    // Click the mic button
    await page.click('button:has-text("Start with voice")');
    
    // Check that primer dialog does NOT appear
    const dialog = page.locator('dialog[role="dialog"]');
    await expect(dialog).not.toBeVisible();
  });

  test('should emit permission_requested before getUserMedia for E2A', async ({ page }) => {
    // Force E2A variant
    await storage.set({
      'ab:E2': 'A',
      'ff.permissionPrimerShort': 'true',
    });

    await page.reload();

    // Click the mic button
    await page.click('button:has-text("Start with voice")');

    // Click continue in primer
    await page.click('dialog button:has-text("Continue")');

    // Get analytics events
    const analyticsEvents = await analytics.getEvents();

    // Check that permission_requested was emitted
    const permissionRequested = analyticsEvents.find((e: any) => e.event === 'permission_requested');
    expect(permissionRequested).toBeDefined();
    expect(permissionRequested.props.type).toBe('microphone');
    expect(permissionRequested.props.surface).toBe('instant_practice');
  });

  test('should have proper focus management in primer dialog', async ({ page }) => {
    // Force E2A variant
    await storage.set({
      'ab:E2': 'A',
      'ff.permissionPrimerShort': 'true',
    });

    await page.reload();
    
    // Click the mic button
    await page.click('button:has-text("Start with voice")');
    
    const dialog = page.locator('dialog[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Check that continue button has focus
    const continueButton = dialog.locator('button:has-text("Continue")');
    await expect(continueButton).toBeFocused();
    
    // Test escape key
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('should emit correct event sequence for mic session', async ({ page }) => {
    await analytics.reset();

    // Click the mic button
    await page.click('button:has-text("Start with voice")');

    // Wait for mic to be ready
    await page.waitForSelector('button:has-text("Start")');
    
    // Start recording
    await page.click('button:has-text("Start")');
    
    // Stop recording
    await page.click('button:has-text("Stop")');

    // Get analytics events
    const analyticsEvents = await analytics.getEvents();

    // Check event sequence
    const eventTypes = analyticsEvents.map((e: any) => e.event);
    
    expect(eventTypes).toContain('screen_view');
    expect(eventTypes).toContain('permission_requested');
    expect(eventTypes).toContain('permission_granted');
    expect(eventTypes).toContain('ttv_measured');
    expect(eventTypes).toContain('mic_session_start');
    expect(eventTypes).toContain('mic_session_end');
    expect(eventTypes).toContain('activation');
  });
});
