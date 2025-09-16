import { test, expect } from '@playwright/test';

test('debug dialog state and feature flags', async ({ page }) => {
  // Set pilot cohort cookie to allow access to /try page
  await page.context().addCookies([{
    name: 'pilot_cohort',
    value: 'pilot',
    domain: 'localhost',
    path: '/',
  }]);
  
  // Set localStorage after navigation but before React initializes
  await page.goto('/try');
  
  // Set the flags immediately after navigation
  await page.evaluate(() => {
    localStorage.setItem('ab:E2', 'A');
    localStorage.setItem('ff.permissionPrimerShort', 'true');
    localStorage.setItem('ff.instantPractice', 'true');
  });
  
  // Reload the page to ensure React reads the new flags
  await page.reload();
  
  // Wait for React to hydrate and the page to be interactive
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('button', { timeout: 10000 });

  // Check feature flags and experiment values
  const flags = await page.evaluate(() => {
    return {
      primerShort: localStorage.getItem('ff.permissionPrimerShort'),
      instantPractice: localStorage.getItem('ff.instantPractice'),
      e2Variant: localStorage.getItem('ab:E2'),
    };
  });
  console.log('Feature flags after reload:', flags);

  // Check if the dialog component is in the DOM (even if not visible)
  const dialogInDOM = await page.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    return Array.from(dialogs).map(dialog => ({
      tagName: dialog.tagName,
      className: dialog.className,
      visible: (dialog as HTMLElement).offsetParent !== null,
      style: (dialog as HTMLElement).style.display,
      textContent: dialog.textContent?.substring(0, 100),
    }));
  });
  console.log('Dialogs in DOM before click:', dialogInDOM);

  // Check React component state
  const reactState = await page.evaluate(() => {
    // Try to access React DevTools or component state
    const reactRoot = document.querySelector('#__next');
    return {
      hasReactRoot: !!reactRoot,
      reactRootChildren: reactRoot?.children.length || 0,
    };
  });
  console.log('React state:', reactState);

  // Click the button
  const startBtn = page.getByRole('button', { name: /start|enable microphone/i });
  await startBtn.click();
  
  // Wait a bit for any state changes
  await page.waitForTimeout(1000);

  // Check dialogs in DOM after click
  const dialogInDOMAfter = await page.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    return Array.from(dialogs).map(dialog => ({
      tagName: dialog.tagName,
      className: dialog.className,
      visible: (dialog as HTMLElement).offsetParent !== null,
      style: (dialog as HTMLElement).style.display,
      textContent: dialog.textContent?.substring(0, 100),
    }));
  });
  console.log('Dialogs in DOM after click:', dialogInDOMAfter);

  // Check for any console errors
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('dialog') || msg.text().includes('primer')) {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  // Wait a bit more and check console logs
  await page.waitForTimeout(2000);
  console.log('Console logs:', consoleLogs);

  // Check if the button text changed (indicating mic permission was requested)
  const buttonText = await startBtn.textContent();
  console.log('Button text after click:', buttonText);
});
