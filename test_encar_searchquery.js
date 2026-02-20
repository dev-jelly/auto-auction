const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const searchQuery = encodeURIComponent('E350');
  const action = encodeURIComponent('(And.Manufacturer.벤츠._.ModelGroup.E-클래스.)');
  const url = `https://car.encar.com/list/car?search={"type":"car","action":"${action}","searchQuery":"${searchQuery}"}`;

  console.log(`Testing URL: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
    const text = await page.innerText('body');
    // Check if E350 is in the first few results
    console.log(`Body contains E350: ${text.includes('E350')}`);
    await page.screenshot({ path: 'encar_searchquery_test.png' });
  } catch (e) {
    console.error(`Error: ${e.message}`);
  }

  await browser.close();
})();
