import { BaseAdapter } from '../base';
import { AuctionSource, AuctionItem, AdapterConfig } from '../../types';
import { ONBID_CONFIG } from './config';
import { parseOnbidResponse, extractXmlItems } from './parser';
import type { Page } from 'playwright';

export class OnbidAdapter extends BaseAdapter {
  readonly source = AuctionSource.ONBID;
  readonly name = '온비드';
  private apiKey = '';

  async init(page: Page, config: AdapterConfig): Promise<void> {
    await super.init(page, config);
    this.apiKey = process.env.ONBID_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ONBID_API_KEY environment variable is not set. Onbid scraping will be skipped.');
    }
  }

  async scrape(): Promise<AuctionItem[]> {
    if (!this.apiKey) {
      console.warn('Skipping Onbid scrape: no API key configured.');
      return [];
    }

    const items: AuctionItem[] = [];
    let totalCount = 0;

    for (let pageNo = 1; pageNo <= this.config.maxPages; pageNo++) {
      console.log(`Fetching Onbid page ${pageNo}...`);

      const xml = await this.fetchPage(pageNo);
      if (!xml) {
        console.log('Empty response, stopping.');
        break;
      }

      const result = parseOnbidResponse(xml);

      if (pageNo === 1) {
        totalCount = result.totalCount;
        console.log(`Total items available: ${totalCount}`);
      }

      items.push(...result.items);
      console.log(`Page ${pageNo}: ${result.items.length} vehicle items (total so far: ${items.length})`);

      // Stop if we've fetched all available items
      const fetchedSoFar = pageNo * ONBID_CONFIG.itemsPerPage;
      if (fetchedSoFar >= totalCount) {
        console.log('All pages fetched.');
        break;
      }

      if (result.items.length === 0 && extractXmlItems(xml).length === 0) {
        console.log('No more items returned, stopping.');
        break;
      }
    }

    console.log(`Onbid scraping complete: ${items.length} vehicles found.`);
    return items;
  }

  private buildUrl(pageNo: number): string {
    const params = new URLSearchParams({
      serviceKey: this.apiKey,
      numOfRows: String(ONBID_CONFIG.itemsPerPage),
      pageNo: String(pageNo),
      DPSL_MTD_CD: '0001',
    });
    return `${ONBID_CONFIG.kamcoApiUrl}?${params.toString()}`;
  }

  private async fetchPage(pageNo: number): Promise<string | null> {
    try {
      const url = this.buildUrl(pageNo);
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Onbid API error: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.text();
    } catch (e) {
      console.error(`Failed to fetch Onbid page ${pageNo}:`, e);
      return null;
    }
  }
}
