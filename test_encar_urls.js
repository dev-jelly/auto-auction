const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const urls = [
    // Current DSL (too broad?)
    'https://car.encar.com/list/car?q=(And.Manufacturer.벤츠._.ModelGroup.E-클래스._.Year.range(2021..2021).)',
    // DSL with search keyword
    'https://car.encar.com/list/car?q=(And.Manufacturer.벤츠._.ModelGroup.E-클래스._.Search.E350.)',
    // Modern JSON search format
    'https://car.encar.com/list/car?search={"type":"car","action":"(And.Manufacturer.벤츠._.ModelGroup.E-클래스.)","searchQuery":"E350"}'
  ];

  for (const url of urls) {
    console.log(`Testing URL: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      // Wait for results count
      const count = await page.innerText('.count').catch(() => '0');
      console.log(`Results: ${count.trim()}`);
      
      // Take screenshot of first result to verify
      await page.screenshot({ path: `encar_test_${urls.indexOf(url)}.png` });
    } catch (e) {
      console.error(`Failed to load ${url}: ${e.message}`);
    }
  }

  await browser.close();
})();
