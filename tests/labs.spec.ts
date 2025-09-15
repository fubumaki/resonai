import { test, expect, Page, ConsoleMessage } from '@playwright/test';

function captureConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text() || '';
      // Filter known benign mic-denied warnings; adjust if needed.
      const benign = ['NotAllowedError', 'Permission', 'AudioContext was not allowed'];
      if (!benign.some(b => text.includes(b))) errors.push(text);
    }
  });
  return errors;
}

test.describe('Labs pages render and handle no-mic gracefully', () => {
  test('labs/pitch renders and shows readout or fallback', async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await page.goto('/labs/pitch');

    // Prefer robust test IDs if present (see snippet below).
    const root = page.locator('[data-testid="labs-pitch-root"]');
    const readout = page.locator('[data-testid="pitch-readout"]');
    const fallback = page.locator('[data-testid="no-mic-state"]');

    // If test IDs don't exist yet, fall back to loose selectors.
    const hasRoot = await root.isVisible().catch(() => false);
    if (!hasRoot) {
      await expect(page.getByText(/pitch/i)).toBeVisible({ timeout: 3000 });
    }

    // Either we see the live readout OR the no-mic fallback.
    const ok = (await readout.isVisible().catch(() => false)) ||
               (await fallback.isVisible().catch(() => false));
    expect(ok).toBeTruthy();

    // No unexpected console errors.
    expect(consoleErrors, `Console errors: \n${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('labs/lpc renders and shows f1/f2 placeholders without crashing', async ({ page }) => {
    const consoleErrors = captureConsoleErrors(page);
    await page.goto('/labs/lpc');

    const root = page.locator('[data-testid="labs-lpc-root"]');
    const f1 = page.locator('[data-testid="f1-readout"]');
    const f2 = page.locator('[data-testid="f2-readout"]');

    const hasRoot = await root.isVisible().catch(() => false);
    if (!hasRoot) {
      await expect(page.getByText(/lpc|formant|f1|f2/i)).toBeVisible({ timeout: 3000 });
    }

    // At least the readout shells exist even if numbers are "--".
    const f1Visible = await f1.isVisible().catch(() => false);
    const f2Visible = await f2.isVisible().catch(() => false);
    expect(f1Visible || f2Visible).toBeTruthy();

    expect(consoleErrors, `Console errors: \n${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('Prosody HUD renders on labs/pitch and sliders exist', async ({ page }) => {
    await page.goto('/labs/pitch');
    // HUD should render; tolerate no-mic fallback
    const hud = page.locator('[data-testid="prosody-hud"]');
    await expect(hud).toBeVisible({ timeout: 3000 });

    // Change one control to ensure it's interactive
    const rise = page.locator('#p-rise');
    await rise.fill('300');
    await expect(rise).toHaveValue('300');
  });

  test('Prosody drill renders and shows meter shell', async ({ page }) => {
    await page.goto('/labs/prosody');
    const drill = page.locator('[data-testid="prosody-drill"]');
    await expect(drill.or(page.getByText(/Say as a (statement|question)/i))).toBeVisible({ timeout: 3000 });
    
    // Start recording to trigger meter display
    const startButton = page.locator('button').filter({ hasText: /Start/i });
    await startButton.click();
    
    // Wait for recording to complete (2.5s + buffer)
    await page.waitForTimeout(3000);
    
    // Meter should now be visible after recording
    await expect(page.getByLabel(/Expressiveness meter/i)).toBeVisible({ timeout: 3000 });
  });

  test('Prosody practice card renders and shows results', async ({ page }) => {
    await page.goto('/labs/prosody');
    
    // Toggle to practice card mode
    const checkbox = page.locator('input[type="checkbox"]');
    await checkbox.check();
    
    // Should show practice card
    await expect(page.getByText(/Prosody Practice/i)).toBeVisible({ timeout: 3000 });
    
    // Should show the practice card container
    await expect(page.getByTestId('prosody-practice-card')).toBeVisible({ timeout: 3000 });
    
    // Should show start button
    const startButton = page.getByRole('button', { name: /Start/i });
    await expect(startButton).toBeVisible({ timeout: 3000 });
  });
});
