package models

import (
	"encoding/json"
	"time"
)

type Vehicle struct {
	ID           int64      `json:"id"`
	MgmtNumber   *string    `json:"mgmt_number,omitempty"`
	CarNumber    *string    `json:"car_number,omitempty"`
	Manufacturer *string    `json:"manufacturer,omitempty"`
	ModelName    *string    `json:"model_name,omitempty"`
	FuelType     *string    `json:"fuel_type,omitempty"`
	Transmission *string    `json:"transmission,omitempty"`
	Year         *int       `json:"year,omitempty"`
	Mileage      *int       `json:"mileage,omitempty"`
	Price        *int64     `json:"price,omitempty"`
	MinBidPrice  *int64     `json:"min_bid_price,omitempty"`
	Location     *string    `json:"location,omitempty"`
	Organization *string    `json:"organization,omitempty"`
	DueDate      *time.Time `json:"due_date,omitempty"`
	AuctionCount *int       `json:"auction_count,omitempty"`
	Status       *string    `json:"status,omitempty"`
	ImageURLs    []string   `json:"image_urls,omitempty"`
	DetailURL    *string    `json:"detail_url,omitempty"`
	Source       *string    `json:"source,omitempty"`
	SourceID     *string    `json:"source_id,omitempty"`
	FinalPrice   *int64     `json:"final_price,omitempty"`
	ResultStatus *string    `json:"result_status,omitempty"`
	ResultDate   *time.Time `json:"result_date,omitempty"`
	CaseNumber   *string    `json:"case_number,omitempty"`
	CourtName    *string    `json:"court_name,omitempty"`
	PropertyType *string    `json:"property_type,omitempty"`
	HasInspection *bool     `json:"has_inspection,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type VehicleUpsertRequest struct {
	MgmtNumber   string   `json:"mgmt_number" binding:"required"`
	CarNumber    *string  `json:"car_number,omitempty"`
	Manufacturer *string  `json:"manufacturer,omitempty"`
	ModelName    *string  `json:"model_name,omitempty"`
	FuelType     *string  `json:"fuel_type,omitempty"`
	Transmission *string  `json:"transmission,omitempty"`
	Year         *int     `json:"year,omitempty"`
	Mileage      *int     `json:"mileage,omitempty"`
	Price        *int64   `json:"price,omitempty"`
	MinBidPrice  *int64   `json:"min_bid_price,omitempty"`
	Location     *string  `json:"location,omitempty"`
	Organization *string  `json:"organization,omitempty"`
	DueDate      *string  `json:"due_date,omitempty"`
	AuctionCount *int     `json:"auction_count,omitempty"`
	Status       *string  `json:"status,omitempty"`
	ImageURLs    []string `json:"image_urls,omitempty"`
	DetailURL    *string  `json:"detail_url,omitempty"`
	Source       string   `json:"source"`
	SourceID     string   `json:"source_id"`
	FinalPrice   *int64   `json:"final_price,omitempty"`
	ResultStatus *string  `json:"result_status,omitempty"`
	ResultDate   *string  `json:"result_date,omitempty"`
	CaseNumber   *string  `json:"case_number,omitempty"`
	CourtName    *string  `json:"court_name,omitempty"`
	PropertyType *string  `json:"property_type,omitempty"`
}

type VehicleListParams struct {
	Page          int    `form:"page,default=1"`
	Limit         int    `form:"limit,default=20"`
	Year          *int   `form:"year"`
	PriceMin      *int64 `form:"price_min"`
	PriceMax      *int64 `form:"price_max"`
	FuelType      string `form:"fuel_type"`
	Status        string `form:"status"`
	SortBy        string `form:"sort_by,default=created_at"`
	SortDir       string `form:"sort_dir,default=desc"`
	Source        string `form:"source"`
	ResultStatus  string `form:"result_status"`
	ListingType   string `form:"listing_type"`
	HasInspection *bool  `form:"has_inspection"`
	Search        string `form:"search"`
	CarNumber     string `form:"car_number"`
}

type VehicleListResponse struct {
	Data       []Vehicle  `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

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
	TotalCount     int64           `json:"total_count"`
	AvgPrice       float64         `json:"avg_price"`
	ByFuelType     []FuelTypeStats `json:"by_fuel_type"`
	ByStatus       []StatusStats   `json:"by_status"`
	PriceRange     PriceRange      `json:"price_range"`
	BySource       []SourceStats   `json:"by_source"`
	CompletedCount int64           `json:"completed_count"`
	AvgFinalPrice  float64         `json:"avg_final_price"`
	SaleRate       float64         `json:"sale_rate"`
}

type FuelTypeStats struct {
	FuelType string  `json:"fuel_type"`
	Count    int64   `json:"count"`
	AvgPrice float64 `json:"avg_price"`
}

type StatusStats struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

type PriceRange struct {
	Min int64 `json:"min"`
	Max int64 `json:"max"`
}

type SourceStats struct {
	Source   string  `json:"source"`
	Count    int64   `json:"count"`
	AvgPrice float64 `json:"avg_price"`
}

type SourceInfo struct {
	Source string `json:"source"`
	Name   string `json:"name"`
	Count  int64  `json:"count"`
}

type VehicleInspection struct {
	ID                   int64            `json:"id"`
	VehicleID            int64            `json:"vehicle_id"`
	InspectionDate       *time.Time       `json:"inspection_date,omitempty"`
	VIN                  *string          `json:"vin,omitempty"`
	Displacement         *int             `json:"displacement,omitempty"`
	MileageAtInspection  *int             `json:"mileage_at_inspection,omitempty"`
	Color                *string          `json:"color,omitempty"`
	DriveType            *string          `json:"drive_type,omitempty"`
	ReportData           json.RawMessage  `json:"report_data"`
	ReportURL            *string          `json:"report_url,omitempty"`
	ScrapedAt            *time.Time       `json:"scraped_at,omitempty"`
	CreatedAt            time.Time        `json:"created_at"`
	UpdatedAt            time.Time        `json:"updated_at"`
}

type VehicleInspectionUpsertRequest struct {
	VehicleSourceID     string          `json:"vehicle_source_id" binding:"required"`
	InspectionDate      *string         `json:"inspection_date,omitempty"`
	VIN                 *string         `json:"vin,omitempty"`
	Displacement        *int            `json:"displacement,omitempty"`
	MileageAtInspection *int            `json:"mileage_at_inspection,omitempty"`
	Color               *string         `json:"color,omitempty"`
	DriveType           *string         `json:"drive_type,omitempty"`
	ReportData          json.RawMessage `json:"report_data" binding:"required"`
	ReportURL           *string         `json:"report_url,omitempty"`
}

type VehicleExternalInfo struct {
	ID        int64           `json:"id"`
	CarNumber string          `json:"car_number"`
	Data      json.RawMessage `json:"data"`
	Source    string          `json:"source"`
	FetchedAt time.Time      `json:"fetched_at"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type CarNumberLookupResponse struct {
	Vehicles     []Vehicle            `json:"vehicles"`
	ExternalInfo *VehicleExternalInfo  `json:"external_info,omitempty"`
	Car365URL    string               `json:"car365_url"`
}

type MarketManufacturerMapping struct {
	ID           int    `json:"id"`
	InternalName string `json:"internal_name"`
	KoreanName   string `json:"korean_name"`
	IsForeign    bool   `json:"is_foreign"`
	KcarCode     *string `json:"kcar_code,omitempty"`
	EncarName    *string `json:"encar_name,omitempty"`
}

type MarketFuelMapping struct {
	ID           int    `json:"id"`
	InternalName string `json:"internal_name"`
	EncarName    *string `json:"encar_name,omitempty"`
	KcarCode     *string `json:"kcar_code,omitempty"`
}

type MarketModelMapping struct {
	ID                 int    `json:"id"`
	InternalName       string `json:"internal_name"`
	ManufacturerKorean string `json:"manufacturer_korean"`
	EncarModelGroup    *string `json:"encar_model_group,omitempty"`
	KcarModelCode      *string `json:"kcar_model_code,omitempty"`
}

type MarketMappings struct {
	Manufacturers []MarketManufacturerMapping `json:"manufacturers"`
	FuelTypes     []MarketFuelMapping         `json:"fuel_types"`
	Models        []MarketModelMapping        `json:"models"`
}
