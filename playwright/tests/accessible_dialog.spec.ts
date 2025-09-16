import { test, expect } from '@playwright/test';

test.describe('Accessible dialogs', () => {
  test('traps focus inside delete confirmation', async ({ page }) => {
    await page.goto('/settings');

    await page.getByRole('button', { name: 'Delete All Sessions' }).click();

    const dialog = page.getByRole('dialog', { name: /delete session data/i });
    await expect(dialog).toBeVisible();

    const cancelButton = dialog.getByRole('button', { name: /cancel/i });
    const deleteButton = dialog.getByRole('button', { name: /delete all sessions/i });

    await expect(cancelButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(deleteButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(cancelButton).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(deleteButton).toBeFocused();
  });

  test('dismisses with escape', async ({ page }) => {
    await page.goto('/settings');

    await page.getByRole('button', { name: 'Delete All Sessions' }).click();
    const dialog = page.getByRole('dialog', { name: /delete session data/i });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
