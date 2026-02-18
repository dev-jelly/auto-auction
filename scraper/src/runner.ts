import * as fs from 'fs';
import { createBrowser } from './utils/browser';
import { submitToAPI, submitInspectionReports } from './utils/api-client';
import { ScraperAdapter, AdapterConfig, AuctionItem } from './types';
import { AutomartAdapter } from './adapters/automart';

/**
 * Load adapter by source name
 */
function loadAdapter(source: string): ScraperAdapter {
  switch (source.toLowerCase()) {
    case 'automart':
      return new AutomartAdapter();
    // Future adapters can be added here
    // case 'court_auction':
    //   return new CourtAuctionAdapter();
    // case 'onbid':
    //   return new OnbidAdapter();
    default:
      throw new Error(`Unknown scraper source: ${source}`);
  }
}

/**
 * Deduplicate items by sourceId
 */
function deduplicateItems(items: AuctionItem[]): AuctionItem[] {
  const uniqueMap = new Map<string, AuctionItem>();
  for (const item of items) {
    uniqueMap.set(item.sourceId, item);
  }
  return Array.from(uniqueMap.values());
}

/**
 * Main scraper runner
 */
export async function runScraper(source: string, config: AdapterConfig): Promise<void> {
  const apiUrl = process.env.API_URL || 'http://auto-auction-api:8080';

  console.log(`Starting ${source} scraper...`);
  console.log(`API URL: ${apiUrl}`);
  console.log(`Max pages: ${config.maxPages}`);
  console.log(`Include completed: ${config.includeCompleted}`);
  console.log(`Fetch inspection reports: ${config.fetchInspectionReports}`);

  const { browser, context } = await createBrowser();
  const page = await context.newPage();

  try {
    // Load and initialize adapter
    const adapter = loadAdapter(source);
    console.log(`Loaded adapter: ${adapter.name}`);

    await adapter.init(page, config);

    // Scrape data
    const items = await adapter.scrape();

    // Cleanup
    if (adapter.cleanup) {
      await adapter.cleanup();
    }

    // Deduplicate
    const uniqueItems = deduplicateItems(items);

    // Save backup
    const outputPath = `vehicles-${source}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(uniqueItems, null, 2));
    console.log(`\nTotal: ${uniqueItems.length} unique items saved to ${outputPath}`);

    // Submit to API
    console.log(`\nSubmitting ${uniqueItems.length} items to API at ${apiUrl}...`);
    const { submitted, failed } = await submitToAPI(uniqueItems, apiUrl);

    console.log(`\nCompleted: ${uniqueItems.length} scraped, ${submitted} submitted, ${failed} failed`);

    if (uniqueItems.length > 0 && submitted === 0) {
      console.error('All submissions failed');
      process.exit(1);
    }

    // Submit inspection reports
    if (adapter.inspectionReports.length > 0) {
      console.log(`\nSubmitting ${adapter.inspectionReports.length} inspection reports to API...`);

      // Save backup
      const inspectionOutputPath = `inspections-${source}.json`;
      fs.writeFileSync(inspectionOutputPath, JSON.stringify(adapter.inspectionReports, null, 2));
      console.log(`Inspection reports saved to ${inspectionOutputPath}`);

      const inspResult = await submitInspectionReports(adapter.inspectionReports, apiUrl);
      console.log(`Inspection reports: ${inspResult.submitted} submitted, ${inspResult.failed} failed`);
    }
  } catch (e) {
    console.error('Scraper error:', e);
    process.exit(1);
  } finally {
    await browser.close();
  }
}
