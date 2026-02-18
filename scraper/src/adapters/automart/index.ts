import { BaseAdapter } from '../base';
import { AuctionSource, AuctionItem, AdapterConfig, InspectionReport } from '../../types';
import { AUTOMART_CONFIG } from './config';
import { parseVehicleRow, toAuctionItem } from './parser';
import { parseInspectionReport } from './inspection-parser';
import type { Page } from 'playwright';

export class AutomartAdapter extends BaseAdapter {
  readonly source = AuctionSource.AUTOMART;
  readonly name = 'Automart Scraper';
  inspectionReports: InspectionReport[] = [];

  async init(page: Page, config: AdapterConfig): Promise<void> {
    await super.init(page, config);
    console.log('Loading initial page...');
    await this.page.goto(AUTOMART_CONFIG.activeUrl, {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });
    await this.wait(3000);
  }

  async scrape(): Promise<AuctionItem[]> {
    const items: AuctionItem[] = [];

    console.log('Scraping active auctions...');
    const activeItems = await this.scrapeUrl(AUTOMART_CONFIG.activeUrl, false);
    items.push(...activeItems);

    if (this.config.includeCompleted) {
      console.log('Scraping completed auctions...');
      await this.page.goto(AUTOMART_CONFIG.completedUrl, {
        timeout: 30000,
        waitUntil: 'domcontentloaded',
      });
      await this.wait(3000);
      const completedItems = await this.scrapeUrl(AUTOMART_CONFIG.completedUrl, true);
      items.push(...completedItems);
    }

    if (this.config.fetchInspectionReports) {
      const itemsWithReports = items.filter(item => item.inspectionReportUrl);
      if (itemsWithReports.length > 0) {
        console.log(`\nFetching inspection reports for ${itemsWithReports.length} vehicles...`);
        this.inspectionReports = await this.scrapeInspectionReports(itemsWithReports);
        console.log(`Fetched ${this.inspectionReports.length} inspection reports`);
      }
    }

    return items;
  }

  private async scrapeUrl(url: string, isCompleted: boolean): Promise<AuctionItem[]> {
    const items: AuctionItem[] = [];

    for (let pageNum = 1; pageNum <= this.config.maxPages; pageNum++) {
      console.log(`Processing page ${pageNum}...`);

      if (pageNum > 1) {
        try {
          await this.page.evaluate((pn) => {
            // @ts-ignore
            if (typeof gfnpagemove === 'function') gfnpagemove(pn.toString());
          }, pageNum);
          await this.wait(2000);
          await this.page.waitForLoadState('domcontentloaded');
        } catch (e) {
          console.log(`Error navigating to page ${pageNum}:`, e);
          break;
        }
      }

      const mgmtCells = await this.page.$$('td');
      const processedRows = new Set<string>();
      const pageItems: AuctionItem[] = [];

      for (const cell of mgmtCells) {
        const text = (await cell.innerText()).trim();
        // Management number: YYYY-N (generalized — not hardcoded to a specific year)
        if (!/^\d{4}-\d{1,4}$/.test(text)) continue;
        if (processedRows.has(text)) continue;

        const row = await cell.evaluateHandle((el) => {
          let current = el.parentElement;
          while (current && current.tagName !== 'TR') current = current.parentElement;
          return current;
        });

        if (row) {
          const vehicleData = await parseVehicleRow(row as any, isCompleted);
          if (vehicleData && vehicleData.mgmtNumber) {
            const item = toAuctionItem(vehicleData);
            pageItems.push(item);
            processedRows.add(vehicleData.mgmtNumber);
            console.log(
              `  Found: ${vehicleData.mgmtNumber} - ${vehicleData.modelName} (${vehicleData.price?.toLocaleString()}원)`
            );
          }
        }
      }

      console.log(`Page ${pageNum}: ${processedRows.size} vehicles found`);

      if (this.config.fetchDetailPages) {
        await this.extractFromDetailPages(pageItems);
      }

      items.push(...pageItems);

      // Navigate back to listing page after visiting detail pages
      if (this.config.fetchDetailPages && pageItems.some(item => item.detailUrl)) {
        try {
          await this.page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
          await this.wait(2000);
          if (pageNum > 1) {
            await this.page.evaluate((pn) => {
              // @ts-ignore
              if (typeof gfnpagemove === 'function') gfnpagemove(pn.toString());
            }, pageNum);
            await this.wait(2000);
            await this.page.waitForLoadState('domcontentloaded');
          }
        } catch (e) {
          console.log('Error returning to listing page:', e);
        }
      }

      if (processedRows.size === 0) {
        console.log('No more vehicles found, stopping.');
        break;
      }
    }

    return items;
  }

  /**
   * Visit each vehicle's detail page to extract:
   *   - ALL photos via ImageView.asp (up to 38+ per vehicle)
   *   - Inspection report URL
   *
   * Image strategy:
   *   1. Load CarDetail_in.asp — extract chargeParams from ShowImgTot onclick
   *      and inspectionUrl from pop_on50 onclick in one pass.
   *   2. Navigate to ImageView.asp using chargeParams.
   *   3. Collect all <li class='up'> → span[data-img] URLs (filters empty slots).
   *   4. Fall back to ShowImg extraction (3 main photos) if ShowImgTot not found.
   */
  private async extractFromDetailPages(items: AuctionItem[]): Promise<void> {
    for (const item of items) {
      if (!item.detailUrl) continue;

      try {
        console.log(`  Fetching detail for ${item.mgmtNumber || item.sourceId}...`);
        await this.page.goto(item.detailUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
        await this.wait(this.config.detailDelay);

        // Single pass: extract chargeParams, inspectionUrl, fallback image URLs
        const detailData = await this.page.evaluate(() => {
          let chargeParams: string | null = null;
          let inspectionUrl: string | null = null;
          const fallbackImageUrls: string[] = [];

          for (const el of Array.from(document.querySelectorAll('[onclick]'))) {
            const onclick = el.getAttribute('onclick') || '';

            // ShowImgTot('TotCarPhoto','','chargecd=CHIN02&cifyear=2026&cifseqno=286&carno=XXX7655')
            if (!chargeParams) {
              const m = onclick.match(/ShowImgTot\('[^']+','[^']*','([^']+)'\)/);
              if (m) chargeParams = m[1];
            }

            // pop_on50('Inspect','GmSpec_Report_us.asp?chargecd=...&...',800,800)
            if (!inspectionUrl) {
              const m = onclick.match(/pop_on50\s*\(\s*'[^']*'\s*,\s*'(GmSpec_Report_us\.asp\?[^']+)'/);
              if (m) inspectionUrl = `https://www.automart.co.kr/views/pub_auction/Common/${m[1]}`;
            }
          }

          // Fallback: 3 main photos from ShowImg href
          for (const link of Array.from(document.querySelectorAll('a[href*="ShowImg"]'))) {
            const href = link.getAttribute('href') || '';
            const m = href.match(/ShowImg\('[^']+','[^']*','([^']+)'/);
            if (m && m[1]) {
              const url = m[1].startsWith('http') ? m[1] : `https://${m[1]}`;
              fallbackImageUrls.push(url);
            }
          }

          return { chargeParams, inspectionUrl, fallbackImageUrls };
        });

        if (detailData.inspectionUrl) {
          item.inspectionReportUrl = detailData.inspectionUrl;
          console.log(`    Found inspection report URL`);
        }

        if (detailData.chargeParams) {
          // Navigate to ImageView.asp for the full gallery (all 38+ photos)
          const imageViewUrl = `https://www.automart.co.kr/views/pub_auction/Common/ImageView.asp?filenm=&${detailData.chargeParams}`;
          await this.page.goto(imageViewUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
          await this.wait(500);

          const imageUrls = await this.page.evaluate(() => {
            const urls: string[] = [];
            // <li class='up'><a><span data-img="//image.automart.co.kr/...">label</span></a></li>
            // Only collect <li> with class containing 'up' — empty slots have no class
            for (const li of Array.from(document.querySelectorAll('li'))) {
              if (!li.className.includes('up')) continue;
              const span = li.querySelector('span[data-img]');
              if (!span) continue;
              const raw = span.getAttribute('data-img') || '';
              // Skip empty/placeholder slots: data-img="//" or blank
              if (!raw || raw === '//' || raw === '') continue;
              const url = raw.startsWith('http') ? raw : `https:${raw}`;
              urls.push(url);
            }
            return urls;
          });

          if (imageUrls.length > 0) {
            item.imageUrls = imageUrls;
            console.log(`    Found ${imageUrls.length} image(s) from gallery`);
          } else if (detailData.fallbackImageUrls.length > 0) {
            // ImageView parsed 0 — use 3 main photos as safety net
            item.imageUrls = detailData.fallbackImageUrls;
            console.log(`    Found ${item.imageUrls.length} image(s) from fallback`);
          }
        } else if (detailData.fallbackImageUrls.length > 0) {
          // No ShowImgTot button found — use 3 main photos
          item.imageUrls = detailData.fallbackImageUrls;
          console.log(`    Found ${item.imageUrls.length} image(s) (no gallery button)`);
        }
      } catch (e) {
        console.log(`    Failed for ${item.mgmtNumber || item.sourceId}:`, e);
      }
    }
  }

  private async scrapeInspectionReports(items: AuctionItem[]): Promise<InspectionReport[]> {
    const reports: InspectionReport[] = [];

    for (const item of items) {
      if (!item.inspectionReportUrl) continue;

      try {
        console.log(`  Fetching inspection report for ${item.mgmtNumber || item.sourceId}...`);
        await this.page.goto(item.inspectionReportUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
        await this.wait(this.config.inspectionDelay);

        const data = await parseInspectionReport(this.page);

        reports.push({
          vehicleSourceId: item.sourceId,
          mgmtNumber: item.mgmtNumber || item.sourceId,
          reportUrl: item.inspectionReportUrl,
          data,
          scrapedAt: new Date().toISOString(),
        });

        console.log(`    Parsed inspection report (${Object.keys(data).filter(k => (data as any)[k] != null).length} sections)`);
      } catch (e) {
        console.log(`    Failed to fetch inspection report for ${item.mgmtNumber || item.sourceId}:`, e);
      }
    }

    return reports;
  }
}
