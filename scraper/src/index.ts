import { runScraper } from './runner';

const source = process.env.SCRAPER_SOURCE || 'automart';
const maxPages = parseInt(process.env.SCRAPE_MAX_PAGES || '20', 10);
const includeCompleted = process.env.SCRAPE_INCLUDE_COMPLETED !== 'false';
const fetchDetailPages = process.env.SCRAPE_DETAIL_PAGES !== 'false';
const detailDelay = parseInt(process.env.SCRAPE_DETAIL_DELAY || '1500', 10);
const fetchInspectionReports = process.env.SCRAPE_INSPECTION_REPORTS === 'true';
const inspectionDelay = parseInt(process.env.SCRAPE_INSPECTION_DELAY || '2000', 10);

runScraper(source, {
  maxPages,
  includeCompleted,
  fetchDetailPages,
  detailDelay,
  fetchInspectionReports,
  inspectionDelay,
}).catch((err) => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
