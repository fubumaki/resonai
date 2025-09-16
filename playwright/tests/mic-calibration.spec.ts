import { test, expect } from '@playwright/test';

test.describe('Mic Calibration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up pilot cohort and feature flag
    await page.context().addCookies([
      {
        name: 'pilot_cohort',
        value: 'pilot',
        domain: 'localhost',
        path: '/'
      }
    ]);
    
    await page.goto('/try');
    
    // Set feature flag and reload to ensure React reads it
    await page.evaluate(() => {
      localStorage.setItem('ff.instantPractice', 'true');
    });
    await page.reload();
  });

  test('should render mic calibration flow', async ({ page }) => {
    // Check if the calibration flow appears
    await expect(page.getByText('Step 1: Select Microphone')).toBeVisible();
    
    // Check for basic UI elements
    await expect(page.getByText('Choose your microphone:')).toBeVisible();
    await expect(page.getByText('Cancel')).toBeVisible();
    await expect(page.getByText('Test Microphone')).toBeVisible();
  });

  test('should show device selection dropdown', async ({ page }) => {
    // Wait for devices to load
    await expect(page.getByText('Choose your microphone:')).toBeVisible();
    
    // Check for device options (at minimum system default)
    const deviceSelect = page.getByLabel('Microphone selection');
    await expect(deviceSelect).toBeVisible();
    
    // Should have at least system default option
    await expect(deviceSelect).toContainText('System default');
  });

  test('should allow canceling the calibration', async ({ page }) => {
    const cancelButton = page.getByText('Cancel');
    await expect(cancelButton).toBeVisible();
    
    // Click cancel - this should close the dialog or navigate away
    await cancelButton.click();
    
    // Verify we're no longer in the calibration flow
    await expect(page.getByText('Step 1: Select Microphone')).not.toBeVisible();
  });

  test('should handle microphone permission request', async ({ page }) => {
    // Grant microphone permission when requested
    await page.context().grantPermissions(['microphone']);
    
    const testButton = page.getByText('Test Microphone');
    await expect(testButton).toBeVisible();
    
    // Click test microphone - this should request permission and proceed
    await testButton.click();
    
    // Should either show level calibration or an error message
    await Promise.race([
      expect(page.getByText('Step 2: Level Calibration')).toBeVisible(),
      expect(page.getByText(/Could not access microphone/)).toBeVisible(),
      expect(page.getByText(/Permission denied/)).toBeVisible()
    ]);
  });

  test('should show helpful tips', async ({ page }) => {
    await expect(page.getByText(/Tip: Choose a USB microphone/)).toBeVisible();
  });
});
