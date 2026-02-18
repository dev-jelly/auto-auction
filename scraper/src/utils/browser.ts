import { chromium, Browser, BrowserContext } from 'playwright';

export interface BrowserSetup {
  browser: Browser;
  context: BrowserContext;
}

export async function createBrowser(): Promise<BrowserSetup> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });
  return { browser, context };
}
