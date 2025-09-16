import { test, expect } from '@playwright/test';

test('debug page loading and React hydration', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // Set pilot cohort cookie to allow access to /try page
  await page.context().addCookies([{
    name: 'pilot_cohort',
    value: 'pilot',
    domain: 'localhost',
    path: '/',
  }]);
  
  // Navigate to /try page
  await page.goto('/try');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Check page title and basic structure
  const pageInfo = await page.evaluate(() => {
    return {
      title: document.title,
      hasNextScript: !!document.querySelector('#__NEXT_DATA__'),
      hasReactRoot: !!document.querySelector('#__next'),
      bodyChildren: document.body.children.length,
      scripts: Array.from(document.scripts).map(s => s.src || 'inline'),
    };
  });
  console.log('Page info:', pageInfo);

  // Check for JavaScript errors
  const errors = consoleLogs.filter(log => log.includes('[error]'));
  console.log('JavaScript errors:', errors);

  // Check if Next.js is loading
  const nextData = await page.evaluate(() => {
    const script = document.querySelector('#__NEXT_DATA__');
    if (script) {
      try {
        return JSON.parse(script.textContent || '{}');
      } catch (e) {
        return { error: 'Failed to parse __NEXT_DATA__' };
      }
    }
    return null;
  });
  console.log('Next.js data:', nextData);

  // Wait a bit more for React to potentially hydrate
  await page.waitForTimeout(3000);

  // Check again after waiting
  const pageInfoAfter = await page.evaluate(() => {
    return {
      hasReactRoot: !!document.querySelector('#__next'),
      reactRootChildren: document.querySelector('#__next')?.children.length || 0,
      hasInstantPractice: !!document.querySelector('[data-testid="instant-practice"]'),
      hasButton: !!document.querySelector('button'),
    };
  });
  console.log('Page info after wait:', pageInfoAfter);

  // Check all console logs
  console.log('All console logs:', consoleLogs);
});
