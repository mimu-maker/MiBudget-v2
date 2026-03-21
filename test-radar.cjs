const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.text().includes('DEBUG RADAR')) {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  await page.goto('http://localhost:8080');
  
  // Wait for it to load
  await page.waitForTimeout(2000);
  
  // Click on "Category Analysis" tab
  await page.click('button[value="categories"]');
  
  await page.waitForTimeout(1000);
  
  await browser.close();
})();
