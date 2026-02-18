# Scraper Adapter Pattern Architecture

This directory contains the refactored scraper implementation using an adapter pattern for extensibility.

## Architecture Overview

```
src/
├── types.ts                      # Core interfaces and types
├── index.ts                      # Entry point
├── runner.ts                     # Orchestrator
├── utils/
│   ├── browser.ts                # Playwright browser factory
│   ├── dates.ts                  # Korean date parsing
│   └── api-client.ts             # API submission logic
└── adapters/
    ├── base.ts                   # Abstract base adapter
    └── automart/
        ├── index.ts              # Automart adapter implementation
        ├── parser.ts             # Row parsing logic
        └── config.ts             # URLs and constants
```

## Key Concepts

### ScraperAdapter Interface

All scrapers implement the `ScraperAdapter` interface:

```typescript
interface ScraperAdapter {
  readonly source: AuctionSource;
  readonly name: string;
  init(page: Page, config: AdapterConfig): Promise<void>;
  scrape(): Promise<AuctionItem[]>;
  cleanup?(): Promise<void>;
}
```

### AuctionItem

Unified data model across all sources:

- `sourceId`: Unique identifier in format `<source>:<id>`
- `source`: Enum value (AUTOMART, COURT_AUCTION, ONBID)
- Source-specific fields: `mgmtNumber`, `caseNumber`, etc.
- Common fields: `modelName`, `price`, `status`, etc.

## Usage

### Environment Variables

- `SCRAPER_SOURCE`: Source to scrape (default: `automart`)
- `SCRAPE_MAX_PAGES`: Maximum pages to scrape (default: `20`)
- `SCRAPE_INCLUDE_COMPLETED`: Include completed auctions (default: `true`)
- `API_URL`: Backend API URL (default: `http://auto-auction-api:8080`)

### Running

```bash
# New adapter pattern
npm run scrape

# Legacy scraper (fallback)
npm run scrape:legacy

# With custom config
SCRAPER_SOURCE=automart SCRAPE_MAX_PAGES=10 npm run scrape
```

### Docker

```bash
docker build -t scraper .
docker run -e SCRAPER_SOURCE=automart -e API_URL=http://backend:8080 scraper
```

## Adding New Adapters

1. Create adapter directory: `src/adapters/my-source/`
2. Implement `ScraperAdapter` interface
3. Add to `loadAdapter()` in `runner.ts`
4. Add enum value to `AuctionSource` in `types.ts`

### Example Adapter Structure

```typescript
// src/adapters/my-source/index.ts
import { BaseAdapter } from '../base';
import { AuctionSource, AuctionItem } from '../../types';

export class MySourceAdapter extends BaseAdapter {
  readonly source = AuctionSource.MY_SOURCE;
  readonly name = 'My Source Scraper';

  async init(page: Page, config: AdapterConfig): Promise<void> {
    await super.init(page, config);
    // Initialize page
  }

  async scrape(): Promise<AuctionItem[]> {
    // Scraping logic
    return [];
  }
}
```

## Features

- **Extensible**: Easy to add new sources
- **Type-safe**: Full TypeScript coverage
- **Unified API**: Common interface for all sources
- **Deduplication**: Automatic by `sourceId`
- **Retry logic**: 3 attempts with exponential backoff
- **Backward compatible**: Legacy scraper still works

## Migration Notes

The original `scrape.ts` is preserved for backward compatibility. The new implementation:

- Extracts parsing logic to dedicated parser module
- Adds support for completed auctions
- Implements adapter pattern for multiple sources
- Maintains exact same parsing behavior
- Uses `sourceId` format: `automart:<mgmtNumber>`
