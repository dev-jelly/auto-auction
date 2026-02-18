import type { Page, ElementHandle } from 'playwright';
import { AuctionSource, AdapterConfig, ScraperAdapter, InspectionReport } from '../types';

export abstract class BaseAdapter implements ScraperAdapter {
  protected page!: Page;
  protected config!: AdapterConfig;
  inspectionReports: InspectionReport[] = [];

  abstract readonly source: AuctionSource;
  abstract readonly name: string;

  async init(page: Page, config: AdapterConfig): Promise<void> {
    this.page = page;
    this.config = config;
  }

  abstract scrape(): Promise<any[]>;

  async cleanup(): Promise<void> {
    // Default implementation - can be overridden
  }

  /**
   * Parse price string to number (removes commas and extracts digits)
   */
  protected parsePrice(priceText: string): number | null {
    if (!priceText) return null;
    const match = priceText.replace(/,/g, '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Get text content from a cell at given index
   */
  protected async getCellText(cells: ElementHandle[], index: number): Promise<string> {
    if (index >= cells.length) return '';
    return (await cells[index].innerText()).trim();
  }

  /**
   * Wait for selector with timeout
   */
  protected async waitForSelector(selector: string, timeout: number = 10000): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait with timeout
   */
  protected async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }
}
