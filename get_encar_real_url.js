const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.encar.com', { waitUntil: 'networkidle' });
    
    // Click Search Bar
    await page.click('#search-text');
    await page.fill('#search-text', 'E350');
    await page.press('#search-text', 'Enter');
    
    await page.waitForTimeout(3000);
    console.log(`Final Search URL: ${page.url()}`);
    
    // Check if there are results
    const resultsCount = await page.innerText('.count').catch(() => 'unknown');
    console.log(`Results count: ${resultsCount}`);
    
    await page.screenshot({ path: 'encar_real_search.png' });
  } catch (e) {
    console.error(`Error: ${e.message}`);
  }

  await browser.close();
})();
