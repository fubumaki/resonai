import { test, expect } from '@playwright/test';

test.describe('Practice HUD', () => {
  test.beforeEach(async ({ page }) => {
    // Set up feature flags and cookies
    await page.addInitScript(() => {
      document.cookie = 'pilot_cohort=test; path=/';
      localStorage.setItem('ff.instantPractice', 'true');
    });

    // Navigate to the practice page
    await page.goto('/try');
  });

  test('should show HUD when recording starts', async ({ page }) => {
    // Click the setup microphone button
    await page.getByText(/Setup microphone|Start with voice/).click();

    // Wait for calibration flow or permission dialog
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // If calibration flow appears, cancel it to use basic flow
    const cancelButton = page.getByText('Cancel');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    // Wait for microphone to be ready
    await expect(page.getByText('Start')).toBeVisible({ timeout: 10000 });

    // Start recording
    await page.getByText('Start').click();

    // Check if HUD appears
    await expect(page.locator('.practice-hud')).toBeVisible({ timeout: 5000 });

    // Check for basic HUD elements
    await expect(page.getByText('Pitch')).toBeVisible();
    await expect(page.getByText('Brightness')).toBeVisible();
    await expect(page.getByText('Confidence')).toBeVisible();
    await expect(page.getByText('In Range')).toBeVisible();
  });

  test('should hide HUD when recording stops', async ({ page }) => {
    // Set up microphone (same as above test)
    await page.getByText(/Setup microphone|Start with voice/).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    const cancelButton = page.getByText('Cancel');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    await expect(page.getByText('Start')).toBeVisible({ timeout: 10000 });

    // Start recording
    await page.getByText('Start').click();

    // Wait for HUD to appear
    await expect(page.locator('.practice-hud')).toBeVisible({ timeout: 5000 });

    // Stop recording
    await page.getByText('Stop').click();

    // HUD should be hidden
    await expect(page.locator('.practice-hud')).not.toBeVisible();
  });

  test('should display metrics with proper formatting', async ({ page }) => {
    // Set up microphone
    await page.getByText(/Setup microphone|Start with voice/).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    const cancelButton = page.getByText('Cancel');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    await expect(page.getByText('Start')).toBeVisible({ timeout: 10000 });

    // Start recording
    await page.getByText('Start').click();

    // Wait for HUD
    await expect(page.locator('.practice-hud')).toBeVisible({ timeout: 5000 });

    // Check that metrics are displayed with proper units
    const pitchElement = page.getByText(/Hz/);
    const brightnessElement = page.getByText(/%/);
    const confidenceElement = page.getByText(/%/);

    await expect(pitchElement).toBeVisible();
    await expect(brightnessElement).toBeVisible();
    await expect(confidenceElement).toBeVisible();

    // Check for target ranges display
    await expect(page.getByText(/Target:/)).toBeVisible();
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Set up microphone
    await page.getByText(/Setup microphone|Start with voice/).click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    const cancelButton = page.getByText('Cancel');
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
    }

    await expect(page.getByText('Start')).toBeVisible({ timeout: 10000 });

    // Start recording
    await page.getByText('Start').click();

    // Wait for HUD
    await expect(page.locator('.practice-hud')).toBeVisible({ timeout: 5000 });

    // Check accessibility attributes
    const hud = page.locator('.practice-hud');
    await expect(hud).toHaveAttribute('role', 'status');
    await expect(hud).toHaveAttribute('aria-live', 'polite');
    await expect(hud).toHaveAttribute('aria-label', 'Practice metrics');

    // Check for ARIA labels on metric values
    await expect(page.getByLabel(/Current pitch:/)).toBeVisible();
    await expect(page.getByLabel(/Current brightness:/)).toBeVisible();
    await expect(page.getByLabel(/Analysis confidence:/)).toBeVisible();
    await expect(page.getByLabel(/Time in range:/)).toBeVisible();
  });

  test('should handle microphone errors gracefully', async ({ page }) => {
    // Mock getUserMedia to reject
    await page.addInitScript(() => {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
        new Error('Permission denied')
      );
    });

    // Try to set up microphone
    await page.getByText(/Setup microphone|Start with voice/).click();

    // Should show error message
    await expect(page.getByText(/Permission denied|Microphone access denied/)).toBeVisible({ timeout: 5000 });

    // HUD should not be visible
    await expect(page.locator('.practice-hud')).not.toBeVisible();
  });
});
