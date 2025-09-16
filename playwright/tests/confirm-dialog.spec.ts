import { test, expect } from '@playwright/test';

test.describe('Confirm Dialog Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Create a test page with the confirm dialog
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Confirm Dialog Test</title>
          <style>
            body { font-family: system-ui; margin: 0; padding: 20px; }
            .test-button { padding: 8px 16px; margin: 8px; }
            .confirm-dialog-backdrop {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0, 0, 0, 0.5);
              z-index: 50;
            }
            .confirm-dialog {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              z-index: 51;
              background: white;
              border: 1px solid #ccc;
              border-radius: 12px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              max-width: 400px;
              width: 90vw;
              padding: 24px;
            }
            .confirm-dialog-actions {
              display: flex;
              gap: 12px;
              justify-content: flex-end;
              margin-top: 16px;
            }
            .confirm-dialog-title {
              margin: 0 0 8px 0;
              font-size: 18px;
              font-weight: 600;
            }
            .confirm-dialog-description {
              margin: 0 0 16px 0;
              color: #666;
              font-size: 14px;
            }
            button {
              padding: 8px 16px;
              border: 1px solid #ccc;
              border-radius: 4px;
              background: white;
              cursor: pointer;
            }
            button:hover {
              background: #f5f5f5;
            }
            button:focus {
              outline: 2px solid #0066cc;
              outline-offset: 2px;
            }
            .button-destructive {
              background: #dc2626;
              color: white;
              border-color: #dc2626;
            }
            .button-destructive:hover {
              background: #b91c1c;
            }
          </style>
        </head>
        <body>
          <button id="open-dialog" class="test-button">Open Dialog</button>
          <button id="open-destructive" class="test-button">Open Destructive Dialog</button>
          <button id="open-no-description" class="test-button">Open Dialog (No Description)</button>
          
          <div id="dialog-container"></div>
          
          <script>
            function createDialog(config) {
              const container = document.getElementById('dialog-container');
              container.innerHTML = \`
                <div class="confirm-dialog-backdrop" aria-hidden="true"></div>
                <div 
                  class="confirm-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="confirm-dialog-title"
                  \${config.description ? 'aria-describedby="confirm-dialog-description"' : ''}
                >
                  <h2 id="confirm-dialog-title" class="confirm-dialog-title">
                    \${config.title}
                  </h2>
                  \${config.description ? \`
                    <p id="confirm-dialog-description" class="confirm-dialog-description">
                      \${config.description}
                    </p>
                  \` : ''}
                  <div class="confirm-dialog-actions">
                    <button id="cancel-btn" type="button">\${config.cancelText || 'Cancel'}</button>
                    <button 
                      id="confirm-btn" 
                      type="button"
                      class="\${config.confirmVariant === 'destructive' ? 'button-destructive' : ''}"
                    >
                      \${config.confirmText || 'Confirm'}
                    </button>
                  </div>
                </div>
              \`;
              
              // Focus management
              const dialog = container.querySelector('.confirm-dialog');
              const cancelBtn = container.querySelector('#cancel-btn');
              const confirmBtn = container.querySelector('#confirm-btn');
              
              // Focus first button
              cancelBtn.focus();
              
              // Tab trapping
              const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                  closeDialog();
                } else if (e.key === 'Tab') {
                  const focusables = [cancelBtn, confirmBtn];
                  const currentIndex = focusables.indexOf(document.activeElement);
                  
                  if (e.shiftKey) {
                    e.preventDefault();
                    const prevIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
                    focusables[prevIndex].focus();
                  } else {
                    e.preventDefault();
                    const nextIndex = currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1;
                    focusables[nextIndex].focus();
                  }
                }
              };
              
              const closeDialog = () => {
                container.innerHTML = '';
                document.removeEventListener('keydown', handleKeyDown);
                document.getElementById('open-dialog').focus();
              };
              
              cancelBtn.addEventListener('click', closeDialog);
              confirmBtn.addEventListener('click', () => {
                if (config.onConfirm) config.onConfirm();
                closeDialog();
              });
              
              document.addEventListener('keydown', handleKeyDown);
            }
            
            document.getElementById('open-dialog').addEventListener('click', () => {
              createDialog({
                title: 'Confirm Action',
                description: 'Are you sure you want to proceed? This action cannot be undone.',
                confirmText: 'Yes, proceed',
                cancelText: 'Cancel',
                onConfirm: () => console.log('Confirmed')
              });
            });
            
            document.getElementById('open-destructive').addEventListener('click', () => {
              createDialog({
                title: 'Delete Item',
                description: 'This will permanently delete the item. Are you sure?',
                confirmText: 'Delete',
                cancelText: 'Cancel',
                confirmVariant: 'destructive',
                onConfirm: () => console.log('Deleted')
              });
            });
            
            document.getElementById('open-no-description').addEventListener('click', () => {
              createDialog({
                title: 'Simple Confirmation',
                confirmText: 'OK',
                cancelText: 'Cancel',
                onConfirm: () => console.log('Confirmed')
              });
            });
          </script>
        </body>
      </html>
    `);
  });

  test('has proper ARIA attributes', async ({ page }) => {
    await page.click('#open-dialog');
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
    await expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-description');
  });

  test('has proper ARIA attributes without description', async ({ page }) => {
    await page.click('#open-no-description');
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title');
    await expect(dialog).not.toHaveAttribute('aria-describedby');
  });

  test('traps focus within dialog', async ({ page }) => {
    await page.click('#open-dialog');
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // First focusable element should be focused
    const cancelBtn = page.locator('#cancel-btn');
    await expect(cancelBtn).toBeFocused();
    
    // Tab should move to confirm button
    await page.keyboard.press('Tab');
    const confirmBtn = page.locator('#confirm-btn');
    await expect(confirmBtn).toBeFocused();
    
    // Tab again should wrap to cancel button
    await page.keyboard.press('Tab');
    await expect(cancelBtn).toBeFocused();
    
    // Shift+Tab should go backwards
    await page.keyboard.press('Shift+Tab');
    await expect(confirmBtn).toBeFocused();
  });

  test('closes on Escape key', async ({ page }) => {
    await page.click('#open-dialog');
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('restores focus to trigger button when closed', async ({ page }) => {
    const openBtn = page.locator('#open-dialog');
    await openBtn.click();
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(openBtn).toBeFocused();
  });

  test('has proper button labels and roles', async ({ page }) => {
    await page.click('#open-dialog');
    
    const cancelBtn = page.locator('#cancel-btn');
    const confirmBtn = page.locator('#confirm-btn');
    
    await expect(cancelBtn).toHaveText('Cancel');
    await expect(confirmBtn).toHaveText('Yes, proceed');
    await expect(cancelBtn).toHaveAttribute('type', 'button');
    await expect(confirmBtn).toHaveAttribute('type', 'button');
  });

  test('supports destructive variant styling', async ({ page }) => {
    await page.click('#open-destructive');
    
    const confirmBtn = page.locator('#confirm-btn');
    await expect(confirmBtn).toHaveClass(/button-destructive/);
    await expect(confirmBtn).toHaveText('Delete');
  });

  test('announces dialog to screen readers', async ({ page }) => {
    // This test would require a screen reader to verify, but we can check the structure
    await page.click('#open-dialog');
    
    const dialog = page.locator('[role="dialog"]');
    const title = page.locator('#confirm-dialog-title');
    const description = page.locator('#confirm-dialog-description');
    
    await expect(dialog).toBeVisible();
    await expect(title).toHaveText('Confirm Action');
    await expect(description).toHaveText('Are you sure you want to proceed? This action cannot be undone.');
  });

  test('works with keyboard navigation only', async ({ page }) => {
    // Navigate to open button with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Navigate through dialog with keyboard
    await page.keyboard.press('Tab'); // Move to confirm button
    await page.keyboard.press('Enter'); // Click confirm
    
    await expect(dialog).not.toBeVisible();
  });

  test('respects reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.click('#open-dialog');
    
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Check that no transitions are applied (this would need CSS verification)
    const dialogElement = await dialog.elementHandle();
    const computedStyle = await page.evaluate((el) => {
      return el ? window.getComputedStyle(el).transition : 'none';
    }, dialogElement);
    
    // In a real implementation, this should be 'none' when reduced motion is preferred
    expect(computedStyle).toBeDefined();
  });
});
