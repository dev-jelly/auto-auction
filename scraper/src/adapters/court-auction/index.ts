import type { Page } from 'playwright';
import type { ScraperAdapter, AdapterConfig, AuctionItem, InspectionReport } from '../../types';
import { AuctionSource } from '../../types';
import { COURT_AUCTION_CONFIG } from './config';
import { parseCourtAuctionRow } from './parser';

export class CourtAuctionAdapter implements ScraperAdapter {
  readonly source = AuctionSource.COURT_AUCTION;
  readonly name = '법원경매';
  inspectionReports: InspectionReport[] = [];

  private page!: Page;
  private config!: AdapterConfig;

  async init(page: Page, config: AdapterConfig): Promise<void> {
    this.page = page;
    this.config = config;
  }

  async scrape(): Promise<AuctionItem[]> {
    const items: AuctionItem[] = [];

    console.log('Navigating to court auction site...');

    try {
      // Navigate to main page
      await this.page.goto(COURT_AUCTION_CONFIG.baseUrl, {
        timeout: 30000,
        waitUntil: 'domcontentloaded',
      });
      await this.page.waitForTimeout(3000);

      // Court auction site uses frames extensively
      // Try to find and navigate to the vehicle auction search
      // Note: courtauction.go.kr structure may vary and requires careful inspection
      console.log('Court auction scraping is in development mode.');
      console.log('Site structure analysis needed for full implementation.');

      // Attempt basic scraping of the main listing
      for (let pageNum = 1; pageNum <= this.config.maxPages; pageNum++) {
        console.log(`Processing page ${pageNum}...`);

        try {
          // Try to find auction table rows
          const rows = await this.page.$$('table.Ltbl_list tbody tr, table.result tbody tr');

          if (rows.length === 0) {
            console.log('No auction rows found on this page. Court auction adapter needs site-specific tuning.');
            break;
          }

          let pageCount = 0;
          for (const row of rows) {
            const item = await parseCourtAuctionRow(row);
            if (item) {
              items.push(item);
              pageCount++;
              console.log(`  Found: ${item.caseNumber} - ${item.modelName}`);
            }
          }

          console.log(`Page ${pageNum}: ${pageCount} items found`);
          if (pageCount === 0) break;

          // Try pagination
          if (pageNum < this.config.maxPages) {
            try {
              const nextButton = await this.page.$(`a[onclick*="page(${pageNum + 1})"], .pagination a:has-text("${pageNum + 1}")`);
              if (nextButton) {
                await nextButton.click();
                await this.page.waitForTimeout(2000);
              } else {
                break;
              }
            } catch {
              break;
            }
          }
        } catch (e) {
          console.error(`Error on page ${pageNum}:`, e);
          break;
        }
      }
    } catch (e) {
      console.error('Court auction scraping error:', e);
      console.log('Court auction adapter requires further development for site-specific selectors.');
    }

    return items;
  }

  async cleanup(): Promise<void> {
    // No cleanup needed
  }
}
