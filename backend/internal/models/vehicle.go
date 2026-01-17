package models

import (
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
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type VehicleUpsertRequest struct {
	MgmtNumber   string    `json:"mgmt_number" binding:"required"`
	CarNumber    *string   `json:"car_number,omitempty"`
	Manufacturer *string   `json:"manufacturer,omitempty"`
	ModelName    *string   `json:"model_name,omitempty"`
	FuelType     *string   `json:"fuel_type,omitempty"`
	Transmission *string   `json:"transmission,omitempty"`
	Year         *int      `json:"year,omitempty"`
	Mileage      *int      `json:"mileage,omitempty"`
	Price        *int64    `json:"price,omitempty"`
	MinBidPrice  *int64    `json:"min_bid_price,omitempty"`
	Location     *string   `json:"location,omitempty"`
	Organization *string   `json:"organization,omitempty"`
	DueDate      *string   `json:"due_date,omitempty"`
	AuctionCount *int      `json:"auction_count,omitempty"`
	Status       *string   `json:"status,omitempty"`
	ImageURLs    []string  `json:"image_urls,omitempty"`
	DetailURL    *string   `json:"detail_url,omitempty"`
}

type VehicleListParams struct {
	Page     int    `form:"page,default=1"`
	Limit    int    `form:"limit,default=20"`
	Year     *int   `form:"year"`
	PriceMin *int64 `form:"price_min"`
	PriceMax *int64 `form:"price_max"`
	FuelType string `form:"fuel_type"`
	Status   string `form:"status"`
	SortBy   string `form:"sort_by,default=created_at"`
	SortDir  string `form:"sort_dir,default=desc"`
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

type Stats struct {
	TotalCount   int64            `json:"total_count"`
	AvgPrice     float64          `json:"avg_price"`
	ByFuelType   []FuelTypeStats  `json:"by_fuel_type"`
	ByStatus     []StatusStats    `json:"by_status"`
	PriceRange   PriceRange       `json:"price_range"`
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
