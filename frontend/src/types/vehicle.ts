export interface Vehicle {
  id: number;
  mgmtNumber: string;
  carNumber: string;
  modelName: string;
  fuelType: string;
  transmission: string;
  year: number;
  price: number;
  location: string;
  organization: string;
  dueDate: string;
  status: string;
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
}

export interface VehicleApiResponse {
  data: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
}
