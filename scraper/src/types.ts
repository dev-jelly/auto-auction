import type { Page } from 'playwright';

export enum AuctionSource {
  AUTOMART = 'automart',
  COURT_AUCTION = 'court_auction',
  ONBID = 'onbid',
}

export interface AuctionItem {
  sourceId: string;
  source: AuctionSource;
  mgmtNumber?: string;
  carNumber?: string;
  modelName?: string;
  manufacturer?: string;
  fuelType?: string;
  transmission?: string;
  year?: number;
  mileage?: number;
  price?: number;
  minBidPrice?: number;
  finalPrice?: number;
  bidDeadline?: string;
  resultDate?: string;
  auctionCount?: number;
  status: string;
  location?: string;
  organization?: string;
  detailUrl?: string;
  imageUrls?: string[];
  inspectionReportUrl?: string;
  caseNumber?: string;
  courtName?: string;
  propertyType?: string;
  resultStatus?: string;
  scrapedAt: string;
}

export interface InspectionReportData {
  basic_info?: {
    manufacturer?: string;
    model?: string;
    fuel_type?: string;
    year?: string;
    mileage?: string;
    transmission?: string;
    displacement?: string;
    drive_type?: string;
    color?: string;
    vin?: string;
    vehicle_type?: string;
  };
  accessories?: Record<string, boolean>;
  fluid_conditions?: Record<string, string>;
  mechanical_inspection?: Record<string, Record<string, string>>;
  body_diagram?: Record<string, { part: string; condition: string }>;
  exterior_interior_assessment?: string;
  repair_recommendations?: string;
  special_notes?: string;
  insurance_history?: {
    count: number;
    total_amount: number;
    details: string;
  };
}

export interface InspectionReport {
  vehicleSourceId: string;
  mgmtNumber: string;
  reportUrl: string;
  data: InspectionReportData;
  scrapedAt: string;
}

export interface AdapterConfig {
  maxPages: number;
  includeCompleted: boolean;
  fetchDetailPages: boolean;
  detailDelay: number;  // ms between detail page fetches
  fetchInspectionReports: boolean;
  inspectionDelay: number;  // ms between inspection report fetches
  baseUrl?: string;
}

export interface ScraperAdapter {
  readonly source: AuctionSource;
  readonly name: string;
  inspectionReports: InspectionReport[];
  init(page: Page, config: AdapterConfig): Promise<void>;
  scrape(): Promise<AuctionItem[]>;
  cleanup?(): Promise<void>;
}
