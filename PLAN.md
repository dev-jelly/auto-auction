# Plan: Multi-Source Auction Scraper Architecture Expansion

## Current State Analysis

### What exists today
- **Scraper** (`scraper/scrape.ts`): Single monolithic Playwright scraper targeting `automart.co.kr`. Scrapes only active listings (status hardcoded to `'입찰중'`). Navigates paginated table, parses `<td>` cells by index, submits each vehicle to the backend API via `POST /api/vehicles/upsert`. Runs as a K8s CronJob every 6 hours.
- **Backend** (Go/Gin): Single `vehicles` table with `mgmt_number` as unique key. Upsert uses `ON CONFLICT (mgmt_number) DO UPDATE`. No source tracking. No historical result data (final sale price, auction outcome). API supports list/get/upsert/stats.
- **Frontend** (Astro+React): Card grid with filter sidebar. Filters by status (입찰중/유찰/매각), fuel type, year, price. Stats bar shows counts and averages. No source differentiation. No dedicated historical results view.
- **Database schema**: `vehicles` table with 19 columns. `mgmt_number` is `VARCHAR(50) UNIQUE NOT NULL`. No `source` column. No `auction_results` or history table.

### Key limitations
1. `mgmt_number` uniqueness assumes a single source -- different auction sources may have overlapping management numbers (e.g., automart "2026-6" vs court auction "2026타경12345").
2. Status `'입찰중'` is hardcoded in the scraper; past results (매각/유찰) are never scraped.
3. No record of final sale prices, winning bids, or auction outcome history.
4. Scraper is a single file with site-specific parsing logic baked in; adding a new source requires rewriting or duplicating the entire file.

---

## Requirements Summary

- [ ] Scrape past auction results (매각, 유찰) from automart.co.kr in addition to active listings (입찰중)
- [ ] Abstract scraper into a plugin/adapter pattern supporting multiple auction sources
- [ ] Plan for court auctions (법원경매 - courtauction.go.kr) and potentially onbid.co.kr
- [ ] Track data source per vehicle record
- [ ] Store historical auction results (outcomes, final sale prices, bid counts)
- [ ] Backend API changes for source filtering, historical queries, enhanced stats
- [ ] Frontend changes to display past results, filter by source, show outcome history
- [ ] Deployment changes for multiple scraper CronJobs

---

## Scope & Constraints

### In scope
- Scraper plugin architecture and adapter interface
- Automart adapter enhancement (past results)
- Court auction adapter (courtauction.go.kr) skeleton + implementation
- Database schema migration (new columns + new tables)
- Backend API modifications
- Frontend UI additions for source filtering and historical data
- K8s deployment adjustments

### Out of scope
- Image scraping / OCR
- User authentication / accounts
- Push notification system
- Onbid adapter (planned but not in first iteration)
- Price prediction / analytics
- Mobile app

### Technical constraints
- K3s cluster with 2 nodes, limited resources (scraper pod gets 512Mi-1Gi RAM)
- PostgreSQL 16-alpine with 5Gi PVC (sufficient for foreseeable data volume)
- Scraper uses Playwright (headless Chromium) -- required for JS-rendered sites
- Frontend is static output (Astro `output: 'static'`) served by Nginx
- Backend is a single Go binary with Gin framework

---

## Architecture Design

### 1. Scraper Plugin System

#### Directory structure

```
scraper/
  src/
    index.ts                    # Entry point / CLI runner
    types.ts                    # Shared interfaces (AuctionItem, ScraperAdapter, etc.)
    runner.ts                   # Orchestrator: loads adapter by name, runs scrape, submits
    adapters/
      base.ts                   # Abstract base class with shared utilities
      automart/
        index.ts                # AutomartAdapter implements ScraperAdapter
        parser.ts               # Automart-specific HTML parsing
        config.ts               # URLs, selectors, constants
      court-auction/
        index.ts                # CourtAuctionAdapter implements ScraperAdapter
        parser.ts               # Court auction page parsing
        config.ts               # URLs, selectors, constants
      onbid/
        index.ts                # (Future) OnbidAdapter
    utils/
      dates.ts                  # parseKoreanDate and other date utilities
      api-client.ts             # submitToAPI with retry logic
      browser.ts                # Playwright browser/context factory
  scrape.ts                     # DEPRECATED -- kept temporarily for backwards compat
  package.json
  tsconfig.json
```

#### Core interfaces (`scraper/src/types.ts`)

```typescript
/**
 * Source identifier enum. Each adapter registers under one of these.
 */
export enum AuctionSource {
  AUTOMART = 'automart',
  COURT_AUCTION = 'court_auction',
  ONBID = 'onbid',
}

/**
 * Normalized auction item -- the common schema that all adapters produce.
 * Maps 1:1 to the backend VehicleUpsertRequest (with source added).
 */
export interface AuctionItem {
  // Identity
  sourceId: string;          // Source-specific unique ID (mgmt_number for automart, case number for court)
  source: AuctionSource;     // Which adapter produced this

  // Vehicle info
  carNumber?: string;
  modelName?: string;
  manufacturer?: string;
  fuelType?: string;
  transmission?: string;
  year?: number;
  mileage?: number;

  // Auction info
  price?: number;            // 예정가 / 감정가
  minBidPrice?: number;      // 최저입찰가
  finalPrice?: number;       // 낙찰가 (for completed auctions)
  bidDeadline?: string;      // ISO 8601 datetime
  resultDate?: string;       // 매각발표일
  auctionCount?: number;     // 공매/경매 회차
  status: string;            // 입찰중, 매각, 유찰, 취소, etc.

  // Location
  location?: string;
  organization?: string;

  // Metadata
  detailUrl?: string;
  imageUrls?: string[];

  // Court-auction specific (optional, only populated by court adapter)
  caseNumber?: string;       // 사건번호 (e.g., 2026타경12345)
  courtName?: string;        // 법원명
  propertyType?: string;     // 물건종류 (차량, 중기 등)

  scrapedAt: string;         // ISO 8601 datetime
}

/**
 * Configuration passed to each adapter at construction time.
 */
export interface AdapterConfig {
  maxPages: number;
  includeCompleted: boolean;  // Whether to scrape past results (매각/유찰)
  baseUrl?: string;           // Override default URL
}

/**
 * The interface every scraper adapter must implement.
 */
export interface ScraperAdapter {
  readonly source: AuctionSource;
  readonly name: string;      // Human-readable name (e.g., "오토마트 공매")

  /**
   * Initialize the adapter (e.g., navigate to initial page).
   * Receives an already-created Playwright Page.
   */
  init(page: import('playwright').Page, config: AdapterConfig): Promise<void>;

  /**
   * Scrape all items. Returns normalized AuctionItem[].
   * The adapter handles pagination internally.
   */
  scrape(): Promise<AuctionItem[]>;

  /**
   * Optional cleanup (e.g., close modals, navigate away).
   */
  cleanup?(): Promise<void>;
}
```

#### Abstract base class (`scraper/src/adapters/base.ts`)

```typescript
import type { Page } from 'playwright';
import type { ScraperAdapter, AuctionSource, AdapterConfig, AuctionItem } from '../types';

export abstract class BaseAdapter implements ScraperAdapter {
  abstract readonly source: AuctionSource;
  abstract readonly name: string;

  protected page!: Page;
  protected config!: AdapterConfig;

  async init(page: Page, config: AdapterConfig): Promise<void> {
    this.page = page;
    this.config = config;
    await this.navigateToStart();
  }

  abstract scrape(): Promise<AuctionItem[]>;

  protected abstract navigateToStart(): Promise<void>;

  // Shared utility: wait with retry
  protected async waitForSelector(selector: string, timeout = 10000): Promise<void> {
    await this.page.waitForSelector(selector, { timeout });
  }

  // Shared utility: extract text from cell
  protected async getCellText(cell: any): Promise<string> {
    return (await cell.innerText()).trim();
  }

  // Shared utility: parse price string "1,234,000" -> 1234000
  protected parsePrice(text: string): number | undefined {
    const match = text.replace(/,/g, '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : undefined;
  }
}
```

#### Runner (`scraper/src/runner.ts`)

```typescript
import { chromium } from 'playwright';
import type { AuctionItem, AdapterConfig, ScraperAdapter } from './types';
import { AuctionSource } from './types';
import { submitToAPI } from './utils/api-client';
import { AutomartAdapter } from './adapters/automart';
import { CourtAuctionAdapter } from './adapters/court-auction';

const ADAPTER_REGISTRY: Record<AuctionSource, () => ScraperAdapter> = {
  [AuctionSource.AUTOMART]: () => new AutomartAdapter(),
  [AuctionSource.COURT_AUCTION]: () => new CourtAuctionAdapter(),
  [AuctionSource.ONBID]: () => { throw new Error('Onbid adapter not yet implemented'); },
};

export async function runScraper(sourceName: string, config: AdapterConfig): Promise<void> {
  const source = sourceName as AuctionSource;
  const adapterFactory = ADAPTER_REGISTRY[source];
  if (!adapterFactory) {
    throw new Error(`Unknown source: ${sourceName}. Available: ${Object.keys(ADAPTER_REGISTRY).join(', ')}`);
  }

  const adapter = adapterFactory();
  const apiUrl = process.env.API_URL || 'http://auto-auction-api:8080';

  console.log(`Starting ${adapter.name} scraper...`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...',
    locale: 'ko-KR',
  });
  const page = await context.newPage();

  try {
    await adapter.init(page, config);
    const items = await adapter.scrape();

    // Deduplicate by sourceId
    const unique = Array.from(new Map(items.map(i => [i.sourceId, i])).values());

    console.log(`Scraped ${unique.length} unique items from ${adapter.name}`);

    const { submitted, failed } = await submitToAPI(unique, apiUrl);
    console.log(`Completed: ${submitted} submitted, ${failed} failed`);

    if (unique.length > 0 && submitted === 0) {
      process.exit(1);
    }
  } finally {
    await adapter.cleanup?.();
    await browser.close();
  }
}
```

#### Entry point (`scraper/src/index.ts`)

```typescript
import { runScraper } from './runner';

// Usage: SCRAPER_SOURCE=automart SCRAPE_MAX_PAGES=20 npx tsx src/index.ts
const source = process.env.SCRAPER_SOURCE || 'automart';
const maxPages = parseInt(process.env.SCRAPE_MAX_PAGES || '20', 10);
const includeCompleted = process.env.SCRAPE_INCLUDE_COMPLETED !== 'false'; // default true

runScraper(source, { maxPages, includeCompleted }).catch((err) => {
  console.error('Scraper failed:', err);
  process.exit(1);
});
```

### 2. Automart Adapter Enhancement

The existing `scrape.ts` logic moves into `scraper/src/adapters/automart/index.ts` with these changes:

1. **Scrape past results**: Navigate to the "매각결과" or "지난경매" tab in addition to the "입찰중" tab. The automart site has URL parameter `tmode=1` for active auctions and `tmode=2` (or similar) for completed results. The adapter will:
   - First scrape `tmode=1` (active, status=입찰중)
   - Then scrape `tmode=2` or `tmode=3` (completed, parsing status as 매각/유찰)
   - Parse the final sale price (낙찰가) from completed results if available

2. **Extract additional fields**: When scraping completed results, capture:
   - `finalPrice` (낙찰가)
   - `status` as 매각 or 유찰 (not hardcoded)
   - `resultDate` properly parsed

3. **Management number namespace**: Prefix `sourceId` with `automart:` to avoid collisions: `automart:2026-6`.

### 3. Court Auction Adapter

The court auction system (courtauction.go.kr) has a different structure:

- **URL**: `https://www.courtauction.go.kr/`
- **Data structure**: Case-based, not management-number-based
- **Vehicle-specific filtering**: Search for 자동차 (vehicle) category
- **Key fields**: 사건번호 (case number), 법원 (court), 감정가 (appraised price), 최저매각가 (minimum sale price), 매각기일 (sale date)

The adapter will:
1. Navigate to the vehicle auction search page
2. Filter by 물건종류 = 자동차
3. Parse the results table (case number, vehicle info, prices, dates, status)
4. Normalize into `AuctionItem` format with `source: AuctionSource.COURT_AUCTION`
5. Populate court-specific fields (`caseNumber`, `courtName`, `propertyType`)

---

## Data Model Changes

### Migration 001: Add source tracking and auction results

```sql
-- Migration: 001_add_source_and_history.sql

-- 1. Add source column to vehicles table
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS source VARCHAR(30) DEFAULT 'automart',
  ADD COLUMN IF NOT EXISTS source_id VARCHAR(100);

-- 2. Backfill source_id for existing records
UPDATE vehicles SET source_id = CONCAT('automart:', mgmt_number) WHERE source_id IS NULL;

-- 3. Add auction result fields to vehicles
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS final_price BIGINT,          -- 낙찰가
  ADD COLUMN IF NOT EXISTS result_status VARCHAR(30),    -- 매각/유찰/취소
  ADD COLUMN IF NOT EXISTS result_date TIMESTAMP;        -- 매각결과 발표일

-- 4. Add court-auction specific fields (nullable, only used by court adapter)
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS case_number VARCHAR(50),      -- 사건번호 (e.g., 2026타경12345)
  ADD COLUMN IF NOT EXISTS court_name VARCHAR(50),       -- 법원명
  ADD COLUMN IF NOT EXISTS property_type VARCHAR(30);    -- 물건종류

-- 5. Change unique constraint: source + source_id instead of just mgmt_number
-- First, drop the old unique constraint
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_mgmt_number_key;

-- Create new composite unique constraint
ALTER TABLE vehicles ADD CONSTRAINT vehicles_source_source_id_key
  UNIQUE (source, source_id);

-- 6. Create auction_history table for tracking price changes and re-auctions
CREATE TABLE IF NOT EXISTS auction_history (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  auction_round INTEGER,            -- 회차
  listed_price BIGINT,              -- 그 회차의 예정가
  min_bid_price BIGINT,             -- 그 회차의 최저입찰가
  final_price BIGINT,               -- 낙찰가 (NULL if 유찰)
  status VARCHAR(30) NOT NULL,      -- 입찰중, 매각, 유찰, 취소
  bid_deadline TIMESTAMP,
  result_date TIMESTAMP,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_history_vehicle_id ON auction_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_auction_history_status ON auction_history(status);
CREATE INDEX IF NOT EXISTS idx_auction_history_result_date ON auction_history(result_date);

-- 7. New indexes for source filtering
CREATE INDEX IF NOT EXISTS idx_vehicles_source ON vehicles(source);
CREATE INDEX IF NOT EXISTS idx_vehicles_source_id ON vehicles(source_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_result_status ON vehicles(result_status);
CREATE INDEX IF NOT EXISTS idx_vehicles_case_number ON vehicles(case_number);
```

### Migration strategy for existing data

1. Run migration 001 during a maintenance window (or pre-apply, since all new columns are nullable/defaulted).
2. Existing 38 records get `source='automart'`, `source_id='automart:<mgmt_number>'`.
3. The old `mgmt_number` column is preserved for display but is no longer the unique key.
4. The upsert logic changes to `ON CONFLICT (source, source_id)` instead of `ON CONFLICT (mgmt_number)`.
5. No data is lost -- purely additive changes.

### Entity Relationship

```
vehicles (1) ---< (N) auction_history
    |
    +-- source: 'automart' | 'court_auction' | 'onbid'
    +-- source_id: 'automart:2026-6' | 'court:2026타경12345'
    +-- case_number: NULL (automart) | '2026타경12345' (court)
    +-- final_price: populated when auction completes
    +-- result_status: 매각/유찰/NULL(active)
```

---

## Backend API Changes

### Updated Go models (`backend/internal/models/vehicle.go`)

```go
type Vehicle struct {
    // ... existing fields ...
    Source       *string    `json:"source,omitempty"`
    SourceID     *string    `json:"source_id,omitempty"`
    FinalPrice   *int64     `json:"final_price,omitempty"`
    ResultStatus *string    `json:"result_status,omitempty"`
    ResultDate   *time.Time `json:"result_date,omitempty"`
    CaseNumber   *string    `json:"case_number,omitempty"`
    CourtName    *string    `json:"court_name,omitempty"`
    PropertyType *string    `json:"property_type,omitempty"`
}

type VehicleUpsertRequest struct {
    // ... existing fields ...
    Source       string  `json:"source" binding:"required"`      // NEW: required
    SourceID     string  `json:"source_id" binding:"required"`   // NEW: required
    FinalPrice   *int64  `json:"final_price,omitempty"`
    ResultStatus *string `json:"result_status,omitempty"`
    ResultDate   *string `json:"result_date,omitempty"`
    CaseNumber   *string `json:"case_number,omitempty"`
    CourtName    *string `json:"court_name,omitempty"`
    PropertyType *string `json:"property_type,omitempty"`
}

type VehicleListParams struct {
    // ... existing fields ...
    Source       string `form:"source"`                          // NEW: filter by source
    ResultStatus string `form:"result_status"`                   // NEW: filter 매각/유찰
    ListingType  string `form:"listing_type"`                    // NEW: "active" | "completed" | "all"
}

// NEW
type AuctionHistoryEntry struct {
    ID           int64      `json:"id"`
    VehicleID    int64      `json:"vehicle_id"`
    AuctionRound *int       `json:"auction_round,omitempty"`
    ListedPrice  *int64     `json:"listed_price,omitempty"`
    MinBidPrice  *int64     `json:"min_bid_price,omitempty"`
    FinalPrice   *int64     `json:"final_price,omitempty"`
    Status       string     `json:"status"`
    BidDeadline  *time.Time `json:"bid_deadline,omitempty"`
    ResultDate   *time.Time `json:"result_date,omitempty"`
    RecordedAt   time.Time  `json:"recorded_at"`
}

type Stats struct {
    // ... existing fields ...
    BySource     []SourceStats  `json:"by_source"`               // NEW
    CompletedCount int64        `json:"completed_count"`          // NEW: 매각+유찰 total
    AvgFinalPrice  float64      `json:"avg_final_price"`          // NEW
    SaleRate       float64      `json:"sale_rate"`                // NEW: 매각 / (매각+유찰) %
}

type SourceStats struct {
    Source   string  `json:"source"`
    Count    int64   `json:"count"`
    AvgPrice float64 `json:"avg_price"`
}
```

### Updated upsert logic (`backend/internal/repository/vehicle.go`)

The `Upsert` method changes:
- `ON CONFLICT (mgmt_number)` becomes `ON CONFLICT (source, source_id)`
- Adds handling for new fields: `source`, `source_id`, `final_price`, `result_status`, `result_date`, `case_number`, `court_name`, `property_type`
- When upserting a completed auction, if the previous status was `'입찰중'` and new status is `'매각'` or `'유찰'`, insert a record into `auction_history`

### New/modified API endpoints

| Method | Path | Description | Changes |
|--------|------|-------------|---------|
| GET | `/api/vehicles` | List vehicles | Add `source`, `result_status`, `listing_type` query params. `listing_type=active` filters status IN ('입찰중'), `listing_type=completed` filters result_status IN ('매각','유찰') |
| GET | `/api/vehicles/:id` | Get vehicle detail | Include `auction_history` entries in response |
| POST | `/api/vehicles/upsert` | Upsert vehicle | Accept new fields: `source`, `source_id`, `final_price`, `result_status`, etc. Change conflict key |
| GET | `/api/vehicles/:id/history` | **NEW**: Get auction history for a vehicle | Returns `AuctionHistoryEntry[]` |
| GET | `/api/stats` | Get statistics | Add `source` query param for per-source stats. Add `by_source`, `completed_count`, `avg_final_price`, `sale_rate` to response |
| GET | `/api/sources` | **NEW**: List available auction sources | Returns `[{source: "automart", name: "오토마트 공매", count: 38}, ...]` |

### Backend route additions (`backend/main.go`)

```go
api.GET("/vehicles/:id/history", vehicleHandler.GetVehicleHistory)
api.GET("/sources", statsHandler.GetSources)
```

---

## Frontend Changes

### 1. Updated types (`frontend/src/types/vehicle.ts`)

```typescript
export interface Vehicle {
  // ... existing fields ...
  source?: string;
  source_id?: string;
  final_price?: number;
  result_status?: string;
  result_date?: string;
  case_number?: string;
  court_name?: string;
  property_type?: string;
}

export interface VehicleFilters {
  // ... existing fields ...
  source?: string;           // NEW
  listingType?: string;      // NEW: 'active' | 'completed' | 'all'
  resultStatus?: string;     // NEW: '매각' | '유찰'
}

export interface AuctionHistoryEntry {
  id: number;
  vehicle_id: number;
  auction_round?: number;
  listed_price?: number;
  min_bid_price?: number;
  final_price?: number;
  status: string;
  bid_deadline?: string;
  result_date?: string;
  recorded_at: string;
}
```

### 2. Navigation tabs (Layout.astro header)

Add tabs in the header navigation:

```
차량 목록 (current) | 경매 결과 | 경매 일정 | 이용 안내
```

- **차량 목록** (`/`): Shows active listings (`listing_type=active`), current behavior
- **경매 결과** (`/results`): Shows completed auctions with final prices and outcomes

### 3. Source filter pill bar

Add a horizontal pill/tab bar above the vehicle grid (in both VehicleGrid and a new ResultsGrid):

```
[전체] [오토마트] [법원경매] [온비드]
```

Each pill filters by `source` query parameter.

### 4. FilterSidebar enhancements (`frontend/src/components/islands/FilterSidebar.tsx`)

Add new filter sections:

```typescript
const SOURCE_OPTIONS = [
  { value: '', label: '전체 출처' },
  { value: 'automart', label: '오토마트' },
  { value: 'court_auction', label: '법원경매' },
  { value: 'onbid', label: '온비드' },
];

const LISTING_TYPE_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'active', label: '진행중' },
  { value: 'completed', label: '완료 (매각/유찰)' },
];

const RESULT_STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: '매각', label: '매각 (낙찰)' },
  { value: '유찰', label: '유찰' },
];
```

### 5. VehicleCard enhancements

- Show source badge (e.g., small label "오토마트" or "법원경매") in the card header
- For completed auctions: show 낙찰가 (final_price) prominently with a "매각" or "유찰" badge
- For completed auctions: show the result date instead of bid deadline
- Color-code by outcome:
  - 매각: blue badge + final price highlighted
  - 유찰: orange badge + "유찰" label, show listed price with strikethrough
- Show court-specific info (사건번호, 법원명) when `source === 'court_auction'`

### 6. New page: Results (`frontend/src/pages/results.astro`)

```astro
---
import Layout from '../layouts/Layout.astro';
import StatsBar from '../components/islands/StatsBar';
import ResultsGrid from '../components/islands/ResultsGrid';
---

<Layout title="경매 결과 - 공차경매">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <section class="mb-8">
      <div class="card bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 sm:p-8 border-0">
        <h1 class="text-2xl sm:text-3xl font-bold mb-2">경매 결과</h1>
        <p class="text-blue-100 text-sm sm:text-base max-w-2xl">
          과거 경매 결과를 확인하고, 낙찰가 추이를 파악하세요.
        </p>
      </div>
    </section>

    <StatsBar client:load mode="completed" />
    <ResultsGrid client:load />
  </div>
</Layout>
```

### 7. ResultsGrid component (`frontend/src/components/islands/ResultsGrid.tsx`)

A variant of VehicleGrid that defaults `listing_type=completed` and shows:
- 낙찰가 (final_price) as the primary price
- Outcome badge (매각/유찰)
- Result date
- Source badge
- Table/list view option (denser than card grid for historical browsing)

### 8. StatsBar enhancements

- Accept a `mode` prop: `"active"` (default) or `"completed"`
- In completed mode, show: 총 완료 건수, 평균 낙찰가, 매각률, 출처별 통계
- Add source breakdown pills

### 9. Vehicle detail modal/page

When clicking a vehicle card:
- Show full vehicle info
- Show auction history timeline (from `/api/vehicles/:id/history`)
- Each history entry shows: 회차, 예정가, 최저입찰가, 결과(매각/유찰), 낙찰가

---

## Deployment Changes

### K8s CronJob Strategy

Instead of one CronJob, create separate CronJobs per source with staggered schedules:

#### `k8s/base/scraper/cronjob-automart.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scraper-automart
  namespace: auto-auction
spec:
  schedule: "0 */6 * * *"       # Every 6 hours: 00:00, 06:00, 12:00, 18:00
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 3
      activeDeadlineSeconds: 1800
      template:
        spec:
          restartPolicy: OnFailure
          nodeSelector:
            kubernetes.io/hostname: jelly-minipc-ubuntu
          containers:
          - name: scraper
            image: docker-registry.default.svc.cluster.local:5000/auto-auction/scraper:latest
            imagePullPolicy: Never
            env:
            - name: SCRAPER_SOURCE
              value: "automart"
            - name: SCRAPE_INCLUDE_COMPLETED
              value: "true"
            - name: SCRAPE_MAX_PAGES
              value: "20"
            - name: API_URL
              value: "http://auto-auction-api.auto-auction.svc.cluster.local"
            resources:
              requests:
                memory: "512Mi"
                cpu: "250m"
              limits:
                memory: "1Gi"
                cpu: "500m"
```

#### `k8s/base/scraper/cronjob-court-auction.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scraper-court-auction
  namespace: auto-auction
spec:
  schedule: "30 */6 * * *"      # Offset by 30 min: 00:30, 06:30, 12:30, 18:30
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 3
      activeDeadlineSeconds: 1800
      template:
        spec:
          restartPolicy: OnFailure
          nodeSelector:
            kubernetes.io/hostname: jelly-minipc-ubuntu
          containers:
          - name: scraper
            image: docker-registry.default.svc.cluster.local:5000/auto-auction/scraper:latest
            imagePullPolicy: Never
            env:
            - name: SCRAPER_SOURCE
              value: "court_auction"
            - name: SCRAPE_INCLUDE_COMPLETED
              value: "true"
            - name: SCRAPE_MAX_PAGES
              value: "20"
            - name: API_URL
              value: "http://auto-auction-api.auto-auction.svc.cluster.local"
            resources:
              requests:
                memory: "512Mi"
                cpu: "250m"
              limits:
                memory: "1Gi"
                cpu: "500m"
```

### Kustomization updates

```yaml
# k8s/base/kustomization.yaml
resources:
  - ...existing...
  - scraper/cronjob-automart.yaml     # replaces scraper/cronjob.yaml
  - scraper/cronjob-court-auction.yaml
```

### Resource considerations

- Each scraper pod uses up to 1Gi RAM (Chromium headless). Staggering by 30 minutes ensures they don't run simultaneously.
- The `concurrencyPolicy: Forbid` on each CronJob prevents overlap within the same source.
- PVC storage (5Gi) is sufficient -- even 10,000 vehicle records with history would use < 100MB.
- If adding a third source (onbid), stagger at `:00` offset to avoid overlap.

### Docker image

The same scraper Docker image is used for all sources. The `SCRAPER_SOURCE` env var determines which adapter runs. This means:
- Only one image to build and push
- The Dockerfile CMD changes from `["npx", "tsx", "scrape.ts"]` to `["npx", "tsx", "src/index.ts"]`
- All adapters are bundled in the same image

---

## Implementation Steps

### Phase 1: Database Migration & Backend (3-4 days)

1. **Write migration SQL** (`k8s/base/postgres/migrations/001_add_source_and_history.sql`)
   - Add columns to `vehicles`: `source`, `source_id`, `final_price`, `result_status`, `result_date`, `case_number`, `court_name`, `property_type`
   - Create `auction_history` table
   - Change unique constraint from `mgmt_number` to `(source, source_id)`
   - Backfill existing records with `source='automart'`
   - Create new indexes

2. **Apply migration** to the running PostgreSQL instance
   - `kubectl exec` into the postgres pod
   - Run the migration SQL
   - Verify with `\d vehicles` and `\d auction_history`

3. **Update Go models** (`backend/internal/models/vehicle.go`)
   - Add new fields to `Vehicle`, `VehicleUpsertRequest`, `VehicleListParams`
   - Add `AuctionHistoryEntry` struct
   - Update `Stats` with new fields

4. **Update repository** (`backend/internal/repository/vehicle.go`)
   - Modify `Upsert` to use `ON CONFLICT (source, source_id)` and handle new columns
   - Modify `List` to support `source`, `result_status`, `listing_type` filters
   - Add `GetVehicleHistory` method
   - Add `GetSources` method
   - Update `GetStats` to include source breakdown and completed auction stats

5. **Update handlers** (`backend/internal/handlers/`)
   - Add `GetVehicleHistory` handler
   - Add `GetSources` handler
   - Update `ListVehicles` to pass new filter params

6. **Update routes** (`backend/main.go`)
   - Add `GET /api/vehicles/:id/history`
   - Add `GET /api/sources`

7. **Test backend**
   - Manual curl tests against the API
   - Verify upsert with `source` field works
   - Verify list filtering by source and listing_type

### Phase 2: Scraper Refactor (3-4 days)

8. **Create scraper directory structure**
   - `scraper/src/types.ts` -- interfaces
   - `scraper/src/utils/dates.ts` -- move `parseKoreanDate` from `scrape.ts`
   - `scraper/src/utils/api-client.ts` -- move `submitToAPI` from `scrape.ts`, update payload to include `source` and `source_id`
   - `scraper/src/utils/browser.ts` -- Playwright browser factory
   - `scraper/src/adapters/base.ts` -- abstract base class
   - `scraper/src/runner.ts` -- orchestrator
   - `scraper/src/index.ts` -- entry point

9. **Migrate automart scraper to adapter pattern**
   - `scraper/src/adapters/automart/index.ts` -- move scraping logic from `scrape.ts`
   - `scraper/src/adapters/automart/parser.ts` -- row parsing logic
   - `scraper/src/adapters/automart/config.ts` -- URLs, selectors
   - Verify it produces identical output for active listings

10. **Enhance automart adapter for past results**
    - Add scraping of completed auctions (매각/유찰 tabs on automart.co.kr)
    - Parse final sale prices and result statuses
    - Test with `SCRAPE_INCLUDE_COMPLETED=true`

11. **Implement court auction adapter**
    - `scraper/src/adapters/court-auction/index.ts`
    - `scraper/src/adapters/court-auction/parser.ts`
    - `scraper/src/adapters/court-auction/config.ts`
    - Analyze courtauction.go.kr page structure
    - Implement navigation, search filtering (자동차), pagination
    - Parse results into `AuctionItem` format
    - Test locally

12. **Update `package.json`**
    - Change scripts: `"scrape": "tsx src/index.ts"`
    - Keep backwards-compat: `"scrape:legacy": "tsx scrape.ts"`

13. **Update Dockerfile**
    - Change CMD to `["npx", "tsx", "src/index.ts"]`

14. **Test scraper locally**
    - `SCRAPER_SOURCE=automart SCRAPE_INCLUDE_COMPLETED=true npx tsx src/index.ts`
    - `SCRAPER_SOURCE=court_auction npx tsx src/index.ts`

### Phase 3: Frontend Updates (3-4 days)

15. **Update types** (`frontend/src/types/vehicle.ts`)
    - Add new fields to `Vehicle` interface
    - Add `AuctionHistoryEntry` interface
    - Update `VehicleFilters`

16. **Update FilterSidebar**
    - Add source filter (출처) pills/dropdown
    - Add listing type toggle (진행중 / 완료)
    - Add result status filter (매각 / 유찰) -- visible only when listing_type=completed

17. **Update VehicleGrid**
    - Pass new filter params in query string
    - Show source badge on each card
    - Handle completed auctions display (final_price, result_status)

18. **Update VehicleCard** (both .astro and .tsx versions)
    - Add source badge (small colored label)
    - Conditional display: active vs completed
    - For completed: show 낙찰가, outcome badge, result date

19. **Create ResultsGrid component** (`frontend/src/components/islands/ResultsGrid.tsx`)
    - Similar to VehicleGrid but defaults to `listing_type=completed`
    - Optional table view for denser data display

20. **Create Results page** (`frontend/src/pages/results.astro`)
    - New page at `/results` with results-specific hero section
    - Uses ResultsGrid component

21. **Update Layout navigation**
    - Add "경매 결과" link in header nav pointing to `/results`
    - Highlight active nav item based on current path

22. **Update StatsBar**
    - Accept `mode` prop
    - Show source breakdown
    - Show completed auction stats when mode=completed

23. **Build and test frontend**
    - `npm run build` in frontend directory
    - Verify both pages work
    - Test all filter combinations

### Phase 4: Deployment & Integration (1-2 days)

24. **Create separate CronJob manifests**
    - `k8s/base/scraper/cronjob-automart.yaml`
    - `k8s/base/scraper/cronjob-court-auction.yaml`
    - Delete old `k8s/base/scraper/cronjob.yaml`

25. **Update kustomization.yaml**
    - Reference new CronJob files
    - Remove old cronjob.yaml reference

26. **Build and push images**
    - Rebuild scraper image with new structure
    - Rebuild backend image with new endpoints
    - Rebuild frontend image with new pages
    - Push all to the container registry

27. **Deploy**
    - Apply database migration
    - Deploy new backend
    - Deploy new frontend
    - Deploy new CronJobs

28. **Smoke test in production**
    - Trigger manual scraper runs for each source
    - Verify data appears in the frontend
    - Test filtering by source
    - Verify `/results` page shows completed auctions

---

## Acceptance Criteria

- [ ] Existing 38 vehicles retain their data after migration (no data loss)
- [ ] Automart scraper collects both active (입찰중) and completed (매각/유찰) listings
- [ ] Court auction adapter scrapes vehicle auctions from courtauction.go.kr
- [ ] Each vehicle record has a `source` field identifying its origin
- [ ] `GET /api/vehicles?source=automart` returns only automart vehicles
- [ ] `GET /api/vehicles?source=court_auction` returns only court auction vehicles
- [ ] `GET /api/vehicles?listing_type=completed` returns only 매각/유찰 records
- [ ] `GET /api/vehicles/:id/history` returns auction round history
- [ ] `GET /api/stats` includes source breakdown and sale rate
- [ ] Frontend shows source badges on vehicle cards
- [ ] Frontend `/results` page displays completed auction results with 낙찰가
- [ ] FilterSidebar has source and listing type filters
- [ ] Separate CronJobs run for each scraper source on staggered schedules
- [ ] Adding a new source requires only: (a) new adapter in `scraper/src/adapters/`, (b) register in runner, (c) new CronJob YAML

---

## Risk Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Automart past results page has different HTML structure than active listings | High | Medium | Analyze both tabs' HTML before coding. Build parser that handles both structures. Fall back gracefully if parsing fails for some rows. |
| courtauction.go.kr blocks scraping or uses CAPTCHAs | Medium | High | Use respectful rate limiting (5-10s between requests). Rotate user agents. If blocked, implement only the automart enhancement first and defer court auction. |
| courtauction.go.kr uses iframe/popup-heavy navigation | High | Medium | Playwright can handle iframes and popups. May need `page.frameLocator()` or `page.waitForEvent('popup')`. Research site structure first. |
| Unique constraint migration fails on existing data | Low | High | Run migration in a transaction. Test on a DB dump first. The backfill UPDATE runs before the constraint change. |
| Different sources have overlapping mgmt_number values | Medium | High | Solved by design: unique key is `(source, source_id)`, not `mgmt_number` alone. `source_id` is always prefixed with source name. |
| Scraper resource contention (two Chromium instances) | Low | Medium | Stagger CronJob schedules by 30 minutes. `concurrencyPolicy: Forbid` prevents overlap within same source. |
| Frontend build breaks with new Astro page | Low | Low | Astro static builds are straightforward. Test locally before deploying. |
| Court auction data doesn't map cleanly to vehicle schema | Medium | Medium | Court-specific fields (case_number, court_name) are nullable columns. The core vehicle fields (model, year, price) should be present. Use `property_type` to filter vehicle-only records. |

---

## Verification Steps

### Backend verification
1. Run migration SQL against a test database and verify schema with `\d vehicles` and `\d auction_history`
2. `curl POST /api/vehicles/upsert` with `source: "automart"` -- verify upsert succeeds
3. `curl POST /api/vehicles/upsert` with `source: "court_auction"` -- verify upsert succeeds
4. `curl GET /api/vehicles?source=automart` -- verify filtering
5. `curl GET /api/vehicles?listing_type=completed` -- verify completed filtering
6. `curl GET /api/vehicles/:id/history` -- verify history entries
7. `curl GET /api/sources` -- verify source list
8. `curl GET /api/stats` -- verify new stats fields

### Scraper verification
1. Run `SCRAPER_SOURCE=automart npx tsx src/index.ts` -- verify it scrapes active listings
2. Run `SCRAPER_SOURCE=automart SCRAPE_INCLUDE_COMPLETED=true npx tsx src/index.ts` -- verify it scrapes completed auctions
3. Run `SCRAPER_SOURCE=court_auction npx tsx src/index.ts` -- verify court auction scraping
4. Check API for newly inserted records with correct `source` values
5. Verify deduplication works (run same scraper twice, no duplicate records)

### Frontend verification
1. `npm run build` succeeds without errors
2. Home page (`/`) loads and shows vehicle grid with source badges
3. Results page (`/results`) loads and shows completed auctions
4. Source filter works (clicking "오토마트" shows only automart vehicles)
5. Listing type filter works (toggling active/completed)
6. Vehicle cards show correct info for both active and completed states
7. Navigation links work correctly
8. Dark mode works on new components
9. Mobile responsive layout works on new page

### Deployment verification
1. Database migration applied without errors
2. All three images (api, web, scraper) build and push successfully
3. Both CronJobs are created in K8s: `kubectl get cronjobs -n auto-auction`
4. Manual scraper trigger: `kubectl create job --from=cronjob/scraper-automart test-automart -n auto-auction`
5. Verify job completes: `kubectl logs job/test-automart -n auto-auction`
6. Site loads at https://auto.2msi.org with new features
7. `/results` page accessible at https://auto.2msi.org/results

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|-------------|
| Phase 1: Database & Backend | 3-4 days | None |
| Phase 2: Scraper Refactor | 3-4 days | Phase 1 (needs updated API) |
| Phase 3: Frontend Updates | 3-4 days | Phase 1 (needs updated API) |
| Phase 4: Deployment | 1-2 days | Phases 1-3 |
| **Total** | **10-14 days** | Phases 2 & 3 can run in parallel |

---

*Plan created: 2026-02-18*
*Based on codebase analysis of: scraper/scrape.ts, backend/internal/*, frontend/src/*, k8s/base/*  *
