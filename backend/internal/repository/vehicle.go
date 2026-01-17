package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jelly/auto-auction/backend/internal/models"
)

type VehicleRepository struct {
	pool *pgxpool.Pool
}

func NewVehicleRepository(pool *pgxpool.Pool) *VehicleRepository {
	return &VehicleRepository{pool: pool}
}

func (r *VehicleRepository) List(ctx context.Context, params models.VehicleListParams) (*models.VehicleListResponse, error) {
	// Build WHERE clause
	var conditions []string
	var args []interface{}
	argNum := 1

	if params.Year != nil {
		conditions = append(conditions, fmt.Sprintf("year = $%d", argNum))
		args = append(args, *params.Year)
		argNum++
	}

	if params.PriceMin != nil {
		conditions = append(conditions, fmt.Sprintf("price >= $%d", argNum))
		args = append(args, *params.PriceMin)
		argNum++
	}

	if params.PriceMax != nil {
		conditions = append(conditions, fmt.Sprintf("price <= $%d", argNum))
		args = append(args, *params.PriceMax)
		argNum++
	}

	if params.FuelType != "" {
		conditions = append(conditions, fmt.Sprintf("fuel_type = $%d", argNum))
		args = append(args, params.FuelType)
		argNum++
	}

	if params.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argNum))
		args = append(args, params.Status)
		argNum++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM vehicles %s", whereClause)
	var total int64
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("failed to count vehicles: %w", err)
	}

	// Validate sort parameters
	allowedSortFields := map[string]bool{
		"created_at": true,
		"updated_at": true,
		"price":      true,
		"year":       true,
		"mileage":    true,
	}
	sortBy := "created_at"
	if allowedSortFields[params.SortBy] {
		sortBy = params.SortBy
	}

	sortDir := "DESC"
	if strings.ToUpper(params.SortDir) == "ASC" {
		sortDir = "ASC"
	}

	// Calculate pagination
	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 100 {
		params.Limit = 20
	}
	offset := (params.Page - 1) * params.Limit

	// Build main query
	query := fmt.Sprintf(`
		SELECT id, mgmt_number, car_number, manufacturer, model_name, fuel_type,
		       transmission, year, mileage, price, min_bid_price, location,
		       organization, due_date, auction_count, status, image_urls,
		       detail_url, created_at, updated_at
		FROM vehicles
		%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, whereClause, sortBy, sortDir, argNum, argNum+1)

	args = append(args, params.Limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query vehicles: %w", err)
	}
	defer rows.Close()

	vehicles := make([]models.Vehicle, 0)
	for rows.Next() {
		var v models.Vehicle
		err := rows.Scan(
			&v.ID, &v.MgmtNumber, &v.CarNumber, &v.Manufacturer, &v.ModelName,
			&v.FuelType, &v.Transmission, &v.Year, &v.Mileage, &v.Price,
			&v.MinBidPrice, &v.Location, &v.Organization, &v.DueDate,
			&v.AuctionCount, &v.Status, &v.ImageURLs, &v.DetailURL,
			&v.CreatedAt, &v.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan vehicle: %w", err)
		}
		vehicles = append(vehicles, v)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating vehicles: %w", err)
	}

	totalPages := int(total) / params.Limit
	if int(total)%params.Limit > 0 {
		totalPages++
	}

	return &models.VehicleListResponse{
		Data: vehicles,
		Pagination: models.Pagination{
			Page:       params.Page,
			Limit:      params.Limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (r *VehicleRepository) GetByID(ctx context.Context, id int64) (*models.Vehicle, error) {
	query := `
		SELECT id, mgmt_number, car_number, manufacturer, model_name, fuel_type,
		       transmission, year, mileage, price, min_bid_price, location,
		       organization, due_date, auction_count, status, image_urls,
		       detail_url, created_at, updated_at
		FROM vehicles
		WHERE id = $1
	`

	var v models.Vehicle
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&v.ID, &v.MgmtNumber, &v.CarNumber, &v.Manufacturer, &v.ModelName,
		&v.FuelType, &v.Transmission, &v.Year, &v.Mileage, &v.Price,
		&v.MinBidPrice, &v.Location, &v.Organization, &v.DueDate,
		&v.AuctionCount, &v.Status, &v.ImageURLs, &v.DetailURL,
		&v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get vehicle: %w", err)
	}

	return &v, nil
}

func (r *VehicleRepository) Upsert(ctx context.Context, req models.VehicleUpsertRequest) (*models.Vehicle, error) {
	var dueDate *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		parsed, err := time.Parse(time.RFC3339, *req.DueDate)
		if err != nil {
			// Try alternative formats
			parsed, err = time.Parse("2006-01-02 15:04:05", *req.DueDate)
			if err != nil {
				parsed, err = time.Parse("2006-01-02", *req.DueDate)
				if err != nil {
					return nil, fmt.Errorf("invalid due_date format: %w", err)
				}
			}
		}
		dueDate = &parsed
	}

	query := `
		INSERT INTO vehicles (
			mgmt_number, car_number, manufacturer, model_name, fuel_type,
			transmission, year, mileage, price, min_bid_price, location,
			organization, due_date, auction_count, status, image_urls, detail_url,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
			NOW(), NOW()
		)
		ON CONFLICT (mgmt_number) DO UPDATE SET
			car_number = COALESCE(EXCLUDED.car_number, vehicles.car_number),
			manufacturer = COALESCE(EXCLUDED.manufacturer, vehicles.manufacturer),
			model_name = COALESCE(EXCLUDED.model_name, vehicles.model_name),
			fuel_type = COALESCE(EXCLUDED.fuel_type, vehicles.fuel_type),
			transmission = COALESCE(EXCLUDED.transmission, vehicles.transmission),
			year = COALESCE(EXCLUDED.year, vehicles.year),
			mileage = COALESCE(EXCLUDED.mileage, vehicles.mileage),
			price = COALESCE(EXCLUDED.price, vehicles.price),
			min_bid_price = COALESCE(EXCLUDED.min_bid_price, vehicles.min_bid_price),
			location = COALESCE(EXCLUDED.location, vehicles.location),
			organization = COALESCE(EXCLUDED.organization, vehicles.organization),
			due_date = COALESCE(EXCLUDED.due_date, vehicles.due_date),
			auction_count = COALESCE(EXCLUDED.auction_count, vehicles.auction_count),
			status = COALESCE(EXCLUDED.status, vehicles.status),
			image_urls = COALESCE(EXCLUDED.image_urls, vehicles.image_urls),
			detail_url = COALESCE(EXCLUDED.detail_url, vehicles.detail_url),
			updated_at = NOW()
		RETURNING id, mgmt_number, car_number, manufacturer, model_name, fuel_type,
		          transmission, year, mileage, price, min_bid_price, location,
		          organization, due_date, auction_count, status, image_urls,
		          detail_url, created_at, updated_at
	`

	var v models.Vehicle
	err := r.pool.QueryRow(ctx, query,
		req.MgmtNumber, req.CarNumber, req.Manufacturer, req.ModelName, req.FuelType,
		req.Transmission, req.Year, req.Mileage, req.Price, req.MinBidPrice,
		req.Location, req.Organization, dueDate, req.AuctionCount, req.Status,
		req.ImageURLs, req.DetailURL,
	).Scan(
		&v.ID, &v.MgmtNumber, &v.CarNumber, &v.Manufacturer, &v.ModelName,
		&v.FuelType, &v.Transmission, &v.Year, &v.Mileage, &v.Price,
		&v.MinBidPrice, &v.Location, &v.Organization, &v.DueDate,
		&v.AuctionCount, &v.Status, &v.ImageURLs, &v.DetailURL,
		&v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert vehicle: %w", err)
	}

	return &v, nil
}

func (r *VehicleRepository) GetStats(ctx context.Context) (*models.Stats, error) {
	stats := &models.Stats{}

	// Total count and average price
	err := r.pool.QueryRow(ctx, `
		SELECT COUNT(*), COALESCE(AVG(price), 0)
		FROM vehicles
		WHERE price IS NOT NULL
	`).Scan(&stats.TotalCount, &stats.AvgPrice)
	if err != nil {
		return nil, fmt.Errorf("failed to get basic stats: %w", err)
	}

	// Price range
	err = r.pool.QueryRow(ctx, `
		SELECT COALESCE(MIN(price), 0), COALESCE(MAX(price), 0)
		FROM vehicles
		WHERE price IS NOT NULL
	`).Scan(&stats.PriceRange.Min, &stats.PriceRange.Max)
	if err != nil {
		return nil, fmt.Errorf("failed to get price range: %w", err)
	}

	// By fuel type
	rows, err := r.pool.Query(ctx, `
		SELECT fuel_type, COUNT(*), COALESCE(AVG(price), 0)
		FROM vehicles
		WHERE fuel_type IS NOT NULL
		GROUP BY fuel_type
		ORDER BY COUNT(*) DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get fuel type stats: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var ft models.FuelTypeStats
		if err := rows.Scan(&ft.FuelType, &ft.Count, &ft.AvgPrice); err != nil {
			return nil, fmt.Errorf("failed to scan fuel type stats: %w", err)
		}
		stats.ByFuelType = append(stats.ByFuelType, ft)
	}

	// By status
	rows, err = r.pool.Query(ctx, `
		SELECT status, COUNT(*)
		FROM vehicles
		WHERE status IS NOT NULL
		GROUP BY status
		ORDER BY COUNT(*) DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get status stats: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var s models.StatusStats
		if err := rows.Scan(&s.Status, &s.Count); err != nil {
			return nil, fmt.Errorf("failed to scan status stats: %w", err)
		}
		stats.ByStatus = append(stats.ByStatus, s)
	}

	return stats, nil
}
