export interface Vehicle {
  id: number;
  mgmt_number: string;
  car_number: string;
  manufacturer?: string;
  model_name: string;
  fuel_type: string;
  transmission: string;
  year: number;
  mileage?: number;
  price: number;
  min_bid_price?: number;
  location: string;
  organization: string;
  due_date: string;
  auction_count?: number;
  status: string;
  image_urls?: string[];
  detail_url?: string;
  created_at: string;
  updated_at: string;
  source?: string;
  source_id?: string;
  has_inspection?: boolean;
  final_price?: number;
  result_status?: string;
  result_date?: string;
  case_number?: string;
  court_name?: string;
  property_type?: string;
}

export interface VehicleFilters {
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  fuelType?: string;
  location?: string;
  status?: string;
  search?: string;
  carNumber?: string;
  source?: string;
  listingType?: string;
  resultStatus?: string;
  hasInspection?: boolean;
}

export interface InspectionReportData {
  basic_info: {
    manufacturer?: string;
    model?: string;
    fuel_type?: string;
    year?: number;
    mileage?: number;
    transmission?: string;
    displacement?: string;
    drive_type?: string;
    color?: string;
    vin?: string;
    vehicle_type?: string;
  };
  accessories: Record<string, boolean>;
  fluid_conditions: Record<string, string>;
  mechanical_inspection: Record<string, Record<string, string>>;
  exterior_interior_assessment?: string;
  repair_recommendations?: string;
  special_notes?: string;
  body_diagram: Record<string, { part: string; condition: string }>;
  insurance_history?: {
    count: number;
    total_amount: number;
    details: string;
  };
}

export interface VehicleInspection {
  id: number;
  vehicle_id: number;
  inspection_date?: string;
  vin?: string;
  displacement?: string;
  mileage_at_inspection?: number;
  color?: string;
  drive_type?: string;
  report_data: InspectionReportData;
  report_url?: string;
  scraped_at: string;
  created_at: string;
  updated_at: string;
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

export interface VehicleApiResponse {
  data: Vehicle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

// Auth types
export interface User {
  id: number;
  email: string;
  name: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  expires_in: number;
  user: User;
}

export interface RegisterResponse {
  email_verification_sent: boolean;
  email: string;
  user: User;
  access_token: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface FavoritesCheckResponse {
  favorites: Record<number, boolean>;
}

export interface MarketManufacturerMapping {
  id: number;
  internal_name: string;
  korean_name: string;
  is_foreign: boolean;
  kcar_code?: string;
  encar_name?: string;
}

export interface MarketFuelMapping {
  id: number;
  internal_name: string;
  encar_name?: string;
  kcar_code?: string;
}

export interface MarketModelMapping {
  id: number;
  internal_name: string;
  manufacturer_korean: string;
  encar_model_group?: string;
  kcar_model_code?: string;
}

export interface MarketMappings {
  manufacturers: MarketManufacturerMapping[];
  fuel_types: MarketFuelMapping[];
  models: MarketModelMapping[];
}
