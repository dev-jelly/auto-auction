import type { Page } from 'playwright';
import { BaseAdapter } from '../base';
import { AuctionSource, AuctionItem, AdapterConfig } from '../../types';
import { COURT_AUCTION_CONFIG } from './config';
import { parseCourtAuctionResult } from './parser';

export class CourtAuctionAdapter extends BaseAdapter {
  readonly source = AuctionSource.COURT_AUCTION;
  readonly name = '법원경매';

  async init(page: Page, config: AdapterConfig): Promise<void> {
    await super.init(page, config);
  }

  async scrape(): Promise<AuctionItem[]> {
    const items: AuctionItem[] = [];

    console.log('Navigating to court auction vehicle search...');
    await this.page.goto(COURT_AUCTION_CONFIG.vehicleSearchUrl, {
      timeout: 60000,
      waitUntil: 'networkidle',
    });
    await this.wait(5000);
    console.log('Page loaded:', await this.page.title());

    // Click search and intercept first page response
    const firstPage = await this.clickSearchAndCapture();
    if (!firstPage || firstPage.results.length === 0) {
      console.log('No data from court auction search.');
      return items;
    }

    const totalCount = parseInt(String(firstPage.pageInfo?.totalCnt || '0'), 10);
    const pageSize = parseInt(String(firstPage.pageInfo?.pageSize || '10'), 10);
    const totalPages = Math.ceil(totalCount / pageSize);
    console.log(`Total vehicles: ${totalCount} across ${totalPages} pages`);

    for (const row of firstPage.results) {
      const item = parseCourtAuctionResult(row);
      if (item) {
        items.push(item);
        console.log(`  ${item.caseNumber} - ${item.modelName} (${item.price?.toLocaleString()}원)`);
      }
    }
    console.log(`Page 1: ${firstPage.results.length} items`);

    // Fetch remaining pages directly via API (browser session is active)
    const maxPages = Math.min(totalPages, this.config.maxPages);
    for (let pageNo = 2; pageNo <= maxPages; pageNo++) {
      await this.wait(1200);
      console.log(`Fetching page ${pageNo}/${maxPages}...`);

      const data = await this.fetchPage(pageNo, pageSize);
      if (!data || data.length === 0) break;

      for (const row of data) {
        const item = parseCourtAuctionResult(row);
        if (item) items.push(item);
      }
      console.log(`Page ${pageNo}: ${data.length} items (total: ${items.length})`);
    }

    return items;
  }

  /** Click the 검색 button and capture the API response */
  private async clickSearchAndCapture(): Promise<{ results: any[]; pageInfo: any } | null> {
    return new Promise(async (resolve) => {
      let resolved = false;
      const done = (val: { results: any[]; pageInfo: any } | null) => {
        if (!resolved) { resolved = true; resolve(val); }
      };

      const onResponse = async (resp: any) => {
        if (!resp.url().includes('searchControllerMain')) return;
        try {
          const json = await resp.json();
          if (json?.data?.ipcheck === false) {
            console.log('IP check failed on search response');
            done(null);
            return;
          }
          done({
            results: json?.data?.dlt_srchResult ?? [],
            pageInfo: json?.data?.dma_pageInfo ?? {},
          });
        } catch (e) {
          console.error('Failed to parse search response:', e);
        }
      };

      this.page.on('response', onResponse);

      try {
        // The search button has id ending in "btn_srchCarTmid"
        const btn = await this.page.$('input[id*="btn_srchCarTmid"], button[id*="btn_srchCarTmid"]');
        if (btn) {
          await btn.click();
          console.log('Clicked search button');
        } else {
          console.log('Search button not found by ID, trying text fallback...');
          await this.page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input[type=button]'));
            const btn = inputs.find(el => (el as HTMLInputElement).value === '검색');
            if (btn) (btn as HTMLElement).click();
          });
        }
        // Wait up to 10s for response
        await this.wait(10000);
      } catch (e) {
        console.error('Error clicking search:', e);
      } finally {
        this.page.off('response', onResponse);
      }

      if (!resolved) done(null);
    });
  }

  /** Fetch additional pages using the browser's session context */
  private async fetchPage(pageNo: number, pageSize: number): Promise<any[] | null> {
    try {
      const result = await this.page.evaluate(
        async ({ apiUrl, pageNo, pageSize }) => {
          const resp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify({
              dma_pageInfo: { pageNo, pageSize, totalYn: 'N' },
              dma_srchGdsDtlSrchInfo: {
                cortOfcCd: '',
                csNo: '',
                mclDspslGdsLstUsgCd: '0306',
                sclDspslGdsLstUsgCd: '',
                lafjOrderBy: '1',
              },
            }),
          });
          if (!resp.ok) return null;
          const json = await resp.json();
          if (json?.data?.ipcheck === false) return null;
          return json?.data?.dlt_srchResult ?? null;
        },
        { apiUrl: COURT_AUCTION_CONFIG.searchApiUrl, pageNo, pageSize }
      );
      return result;
    } catch (e) {
      console.error(`fetchPage ${pageNo} error:`, e);
      return null;
    }
  }

  async cleanup(): Promise<void> {}
}
