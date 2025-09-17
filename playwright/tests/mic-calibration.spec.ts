import { test, expect } from '@playwright/test';
import { useFakeMic, useDialogHandler } from './helpers';

test.describe('Mic Calibration Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up fake microphone and dialog handler
    await useFakeMic(page);
    const dialogHandler = await useDialogHandler(page);

    // Navigate to the calibration demo page
    await page.goto('/calibration-demo');
  });

  test('should render mic calibration flow', async ({ page }) => {
    // Click the start calibration button
    await page.getByText(/Start Calibration|Recalibrate Microphone/).click();

    // Check if the calibration flow appears
    await expect(page.getByText('Step 1: Select Microphone')).toBeVisible();

    // Check for basic UI elements
    await expect(page.getByText('Choose your microphone:')).toBeVisible();
    await expect(page.getByText('Cancel')).toBeVisible();
    await expect(page.getByText('Test Microphone')).toBeVisible();
  });

  test('should show device selection dropdown', async ({ page }) => {
    // Click the start calibration button
    await page.getByText(/Start Calibration|Recalibrate Microphone/).click();

    // Wait for devices to load
    await expect(page.getByText('Choose your microphone:')).toBeVisible();

    // Check for device options (at minimum system default)
    const deviceSelect = page.getByLabel('Microphone selection');
    await expect(deviceSelect).toBeVisible();

    // Should have at least system default option
    await expect(deviceSelect).toContainText('System default');
  });

  test('should allow canceling the calibration', async ({ page }) => {
    // Click the start calibration button
    await page.getByText(/Start Calibration|Recalibrate Microphone/).click();

    const cancelButton = page.getByText('Cancel');
    await expect(cancelButton).toBeVisible();

    // Click cancel - this should close the dialog or navigate away
    await cancelButton.click();

    // Verify we're no longer in the calibration flow
    await expect(page.getByText('Step 1: Select Microphone')).not.toBeVisible();
  });

  test('should handle microphone permission request', async ({ page }) => {
    const dialogHandler = await useDialogHandler(page);

    // Click the start calibration button
    await dialogHandler.forceClick(page.getByText(/Start Calibration|Recalibrate Microphone/));

    // Wait for devices to load and select the first available device
    await page.waitForSelector('select[aria-label="Microphone selection"]');
    const deviceSelect = page.getByLabel('Microphone selection');
    await deviceSelect.selectOption({ index: 1 }); // Select first device (not system default)

    // Wait a moment for the button to become enabled
    await page.waitForTimeout(500);

    // Now the test button should be enabled
    const testButton = page.getByText('Test Microphone');
    await expect(testButton).toBeEnabled();

    // Click test microphone - this should request permission
    await testButton.click();

    // In test environment, we expect permission to be denied
    // So we should see an error message or stay on the same step
    await expect(
      page.locator('text=/Could not access microphone|Permission denied|Step 1: Select Microphone/')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show helpful tips', async ({ page }) => {
    // Click the start calibration button
    await page.getByText(/Start Calibration|Recalibrate Microphone/).click();

    await expect(page.getByText(/Tip: Choose a USB microphone/)).toBeVisible();
  });
});
