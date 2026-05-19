const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`Console Error: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`Page Error: ${error.message}`);
  });

  try {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    console.log("Page loaded. Clicking Shared Canvas...");
    
    // Click on Shared Canvas
    await page.click('text=Shared Canvas');
    await page.waitForTimeout(2000);
    
    console.log("Done waiting.");
  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    await browser.close();
  }
})();
