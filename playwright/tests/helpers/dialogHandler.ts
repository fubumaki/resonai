import { Page, Locator } from '@playwright/test';

export interface DialogHandler {
  /** Dismiss any blocking dialogs and wait for them to be gone */
  dismissDialogs(): Promise<void>;
  /** Wait for a specific dialog to appear and then dismiss it */
  waitAndDismissDialog(selector?: string): Promise<void>;
  /** Check if any dialogs are currently blocking interactions */
  hasBlockingDialog(): Promise<boolean>;
  /** Force click an element even if dialogs are present */
  forceClick(locator: Locator): Promise<void>;
}

/**
 * Handles permission dialogs and other blocking UI elements that interfere with test interactions.
 * This helper ensures tests can interact with buttons and other elements even when dialogs are present.
 */
export async function useDialogHandler(page: Page): Promise<DialogHandler> {
  // Add script to detect and handle dialogs
  await page.addInitScript(() => {
    const globalAny = window as any;

    // Track dialog state
    globalAny.__DIALOG_HANDLER__ = {
      hasBlockingDialog: false,
      dialogCount: 0,
    };

    // Monitor for dialogs
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              // Check for various dialog types
              if (element.matches?.('[role="dialog"], dialog, .accessible-dialog, [aria-modal="true"]')) {
                globalAny.__DIALOG_HANDLER__.dialogCount++;
                globalAny.__DIALOG_HANDLER__.hasBlockingDialog = true;
              }
            }
          });
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.matches?.('[role="dialog"], dialog, .accessible-dialog, [aria-modal="true"]')) {
                globalAny.__DIALOG_HANDLER__.dialogCount--;
                globalAny.__DIALOG_HANDLER__.hasBlockingDialog = globalAny.__DIALOG_HANDLER__.dialogCount > 0;
              }
            }
          });
        }
      });
    });

    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });
  });

  return {
    async dismissDialogs() {
      // Look for common dialog dismiss patterns
      const dialogSelectors = [
        '[role="dialog"] button:has-text("Cancel")',
        '[role="dialog"] button:has-text("Close")',
        '[role="dialog"] button:has-text("Dismiss")',
        '[role="dialog"] button[aria-label*="close"]',
        '[role="dialog"] button[aria-label*="dismiss"]',
        'dialog button:has-text("Cancel")',
        'dialog button:has-text("Close")',
        '.accessible-dialog button:has-text("Cancel")',
        '.accessible-dialog button:has-text("Close")',
        '[aria-modal="true"] button:has-text("Cancel")',
        '[aria-modal="true"] button:has-text("Close")',
        // Escape key fallback
        'body'
      ];

      for (const selector of dialogSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 1000 })) {
            if (selector === 'body') {
              // Use escape key as last resort
              await page.keyboard.press('Escape');
            } else {
              await element.click({ timeout: 2000 });
            }
            // Wait a bit for dialog to disappear
            await page.waitForTimeout(500);
            break;
          }
        } catch (error) {
          // Continue to next selector
          continue;
        }
      }

      // Wait for any remaining dialogs to disappear
      await page.waitForFunction(() => {
        const globalAny = window as any;
        return !globalAny.__DIALOG_HANDLER__?.hasBlockingDialog;
      }, { timeout: 5000 });
    },

    async waitAndDismissDialog(selector = '[role="dialog"]') {
      // Wait for dialog to appear
      await page.waitForSelector(selector, { timeout: 10000 });

      // Dismiss it
      await this.dismissDialogs();
    },

    async hasBlockingDialog() {
      return page.evaluate(() => {
        const globalAny = window as any;
        return globalAny.__DIALOG_HANDLER__?.hasBlockingDialog || false;
      });
    },

    async forceClick(locator: Locator) {
      // First try to dismiss any dialogs
      await this.dismissDialogs();

      // Wait a moment for dialogs to clear
      await page.waitForTimeout(200);

      // Try normal click first
      try {
        await locator.click({ timeout: 2000 });
        return;
      } catch (error) {
        // If that fails, try force click
        await locator.click({ force: true, timeout: 2000 });
      }
    }
  };
}
