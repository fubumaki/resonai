// Simple script to verify dialog functionality
const puppeteer = require('puppeteer');

async function verifyDialog() {
  console.log('🔍 Starting dialog verification...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set feature flags
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('ff.permissionPrimerShort', 'true');
      localStorage.setItem('ab:E2', 'A');
    });

    console.log('📱 Navigating to /try page...');
    await page.goto('http://localhost:3003/try');

    // Wait for page to load
    await page.waitForSelector('button[aria-label*="Enable microphone"]', { timeout: 10000 });

    console.log('✅ Page loaded, button found');

    // Check feature flags
    const flags = await page.evaluate(() => ({
      primerShort: localStorage.getItem('ff.permissionPrimerShort'),
      e2Variant: localStorage.getItem('ab:E2'),
    }));
    console.log('🏁 Feature flags:', flags);

    // Click the button
    console.log('🖱️ Clicking start button...');
    await page.click('button[aria-label*="Enable microphone"]');

    // Wait for dialog to appear
    console.log('⏳ Waiting for dialog...');
    await page.waitForTimeout(2000);

    // Check for dialog
    const dialogCount = await page.$$eval('[role="dialog"]', els => els.length);
    const micAccessText = await page.$$eval('text=Microphone Access', els => els.length);

    console.log('📊 Results:');
    console.log(`  - Dialogs found: ${dialogCount}`);
    console.log(`  - "Microphone Access" text: ${micAccessText}`);

    if (dialogCount > 0) {
      console.log('🎉 SUCCESS: Dialog is appearing!');
    } else {
      console.log('❌ ISSUE: Dialog not found');

      // Check what's in the DOM
      const bodyText = await page.evaluate(() => document.body.textContent);
      console.log('📄 Page content preview:', bodyText.substring(0, 200) + '...');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  } finally {
    await browser.close();
  }
}

verifyDialog().catch(console.error);
