package repository

import (
	"context"
	"encoding/json"
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

var vehicleColumns = `id, mgmt_number, car_number, manufacturer, model_name, fuel_type,
	transmission, year, mileage, price, min_bid_price, location,
	organization, due_date, auction_count, status, image_urls, image_labels,
	detail_url, source, source_id, final_price, result_status, result_date,
	case_number, court_name, property_type, created_at, updated_at`

func scanVehicle(row pgx.Row) (*models.Vehicle, error) {
	var v models.Vehicle
	err := row.Scan(
		&v.ID, &v.MgmtNumber, &v.CarNumber, &v.Manufacturer, &v.ModelName,
		&v.FuelType, &v.Transmission, &v.Year, &v.Mileage, &v.Price,
		&v.MinBidPrice, &v.Location, &v.Organization, &v.DueDate,
		&v.AuctionCount, &v.Status, &v.ImageURLs, &v.ImageLabels, &v.DetailURL,
		&v.Source, &v.SourceID, &v.FinalPrice, &v.ResultStatus, &v.ResultDate,
		&v.CaseNumber, &v.CourtName, &v.PropertyType,
		&v.CreatedAt, &v.UpdatedAt,
	)
	return &v, err
}

func scanVehicleFromRows(rows pgx.Rows) (models.Vehicle, error) {
	var v models.Vehicle
	err := rows.Scan(
		&v.ID, &v.MgmtNumber, &v.CarNumber, &v.Manufacturer, &v.ModelName,
		&v.FuelType, &v.Transmission, &v.Year, &v.Mileage, &v.Price,
		&v.MinBidPrice, &v.Location, &v.Organization, &v.DueDate,
		&v.AuctionCount, &v.Status, &v.ImageURLs, &v.ImageLabels, &v.DetailURL,
		&v.Source, &v.SourceID, &v.FinalPrice, &v.ResultStatus, &v.ResultDate,
		&v.CaseNumber, &v.CourtName, &v.PropertyType,
		&v.CreatedAt, &v.UpdatedAt,
	)
	return v, err
}

func (r *VehicleRepository) List(ctx context.Context, params models.VehicleListParams) (*models.VehicleListResponse, error) {
	var conditions []string
	var args []interface{}
	argNum := 1

	if params.Year != nil {
		conditions = append(conditions, fmt.Sprintf("v.year = $%d", argNum))
		args = append(args, *params.Year)
		argNum++
	}

	if params.YearMax != nil {
		conditions = append(conditions, fmt.Sprintf("v.year <= $%d", argNum))
		args = append(args, *params.YearMax)
		argNum++
	}

	if params.PriceMin != nil {
		conditions = append(conditions, fmt.Sprintf("v.price >= $%d", argNum))
		args = append(args, *params.PriceMin)
		argNum++
	}

	if params.PriceMax != nil {
		conditions = append(conditions, fmt.Sprintf("v.price <= $%d", argNum))
		args = append(args, *params.PriceMax)
		argNum++
	}

	if params.MileageMin != nil {
		conditions = append(conditions, fmt.Sprintf("v.mileage >= $%d", argNum))
		args = append(args, *params.MileageMin)
		argNum++
	}

	if params.MileageMax != nil {
		conditions = append(conditions, fmt.Sprintf("v.mileage <= $%d", argNum))
		args = append(args, *params.MileageMax)
		argNum++
	}

	if params.FuelType != "" {
		conditions = append(conditions, fmt.Sprintf("v.fuel_type = $%d", argNum))
		args = append(args, params.FuelType)
		argNum++
	}

	if params.Status != "" {
		conditions = append(conditions, fmt.Sprintf("v.status = $%d", argNum))
		args = append(args, params.Status)
		argNum++
	}

	if params.Source != "" {
		conditions = append(conditions, fmt.Sprintf("v.source = $%d", argNum))
		args = append(args, params.Source)
		argNum++
	}

	if params.ResultStatus != "" {
		conditions = append(conditions, fmt.Sprintf("v.result_status = $%d", argNum))
		args = append(args, params.ResultStatus)
		argNum++
	}

	if params.ListingType == "active" {
		conditions = append(conditions, "v.status = '입찰중'")
	} else if params.ListingType == "completed" {
		conditions = append(conditions, "v.result_status IN ('매각', '유찰')")
	}

	if params.HasInspection != nil {
		if *params.HasInspection {
			conditions = append(conditions, "EXISTS (SELECT 1 FROM vehicle_inspections vi2 WHERE vi2.vehicle_id = v.id)")
		} else {
			conditions = append(conditions, "NOT EXISTS (SELECT 1 FROM vehicle_inspections vi2 WHERE vi2.vehicle_id = v.id)")
		}
	}

	if params.CarNumber != "" {
		conditions = append(conditions, fmt.Sprintf("v.car_number ILIKE $%d", argNum))
		args = append(args, "%"+params.CarNumber+"%")
		argNum++
	}

	if params.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(v.model_name ILIKE $%d OR v.mgmt_number ILIKE $%d OR v.car_number ILIKE $%d OR v.manufacturer ILIKE $%d)", argNum, argNum, argNum, argNum))
		args = append(args, "%"+params.Search+"%")
		argNum++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM vehicles v %s", whereClause)
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
		"due_date":   true,
	}
	sortBy := "v.created_at"
	if allowedSortFields[params.SortBy] {
		sortBy = "v." + params.SortBy
	}

	sortDir := "DESC"
	if strings.ToUpper(params.SortDir) == "ASC" {
		sortDir = "ASC"
	}

	if params.Page < 1 {
		params.Page = 1
	}
	if params.Limit < 1 || params.Limit > 100 {
		params.Limit = 20
	}
	offset := (params.Page - 1) * params.Limit

	// Use v. prefix for all vehicle columns and add has_inspection via LEFT JOIN
	vehicleColumnsAliased := `v.id, v.mgmt_number, v.car_number, v.manufacturer, v.model_name, v.fuel_type,
		v.transmission, v.year, v.mileage, v.price, v.min_bid_price, v.location,
		v.organization, v.due_date, v.auction_count, v.status, v.image_urls, v.image_labels,
		v.detail_url, v.source, v.source_id, v.final_price, v.result_status, v.result_date,
		v.case_number, v.court_name, v.property_type, v.created_at, v.updated_at`

	query := fmt.Sprintf(`
		SELECT %s, (vi.id IS NOT NULL) as has_inspection
		FROM vehicles v
		LEFT JOIN vehicle_inspections vi ON vi.vehicle_id = v.id
		%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d
	`, vehicleColumnsAliased, whereClause, sortBy, sortDir, argNum, argNum+1)

	args = append(args, params.Limit, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query vehicles: %w", err)
	}
	defer rows.Close()

	vehicles := make([]models.Vehicle, 0)
	for rows.Next() {
		var v models.Vehicle
		var hasInspection bool
		err := rows.Scan(
			&v.ID, &v.MgmtNumber, &v.CarNumber, &v.Manufacturer, &v.ModelName,
			&v.FuelType, &v.Transmission, &v.Year, &v.Mileage, &v.Price,
			&v.MinBidPrice, &v.Location, &v.Organization, &v.DueDate,
			&v.AuctionCount, &v.Status, &v.ImageURLs, &v.ImageLabels, &v.DetailURL,
			&v.Source, &v.SourceID, &v.FinalPrice, &v.ResultStatus, &v.ResultDate,
			&v.CaseNumber, &v.CourtName, &v.PropertyType,
			&v.CreatedAt, &v.UpdatedAt,
			&hasInspection,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan vehicle: %w", err)
		}
		v.HasInspection = &hasInspection
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
	query := fmt.Sprintf(`SELECT %s FROM vehicles WHERE id = $1`, vehicleColumns)

	v, err := scanVehicle(r.pool.QueryRow(ctx, query, id))
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get vehicle: %w", err)
	}

	return v, nil
}

func (r *VehicleRepository) Upsert(ctx context.Context, req models.VehicleUpsertRequest) (*models.Vehicle, error) {
	var dueDate *time.Time
	if req.DueDate != nil && *req.DueDate != "" {
		parsed, err := time.Parse(time.RFC3339, *req.DueDate)
		if err != nil {
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

	var resultDate *time.Time
	if req.ResultDate != nil && *req.ResultDate != "" {
		parsed, err := time.Parse(time.RFC3339, *req.ResultDate)
		if err != nil {
			parsed, err = time.Parse("2006-01-02 15:04:05", *req.ResultDate)
			if err != nil {
				parsed, err = time.Parse("2006-01-02", *req.ResultDate)
				if err != nil {
					return nil, fmt.Errorf("invalid result_date format: %w", err)
				}
			}
		}
		resultDate = &parsed
	}

	// Default source/source_id for backwards compatibility
	source := req.Source
	if source == "" {
		source = "automart"
	}
	sourceID := req.SourceID
	if sourceID == "" {
		sourceID = source + ":" + req.MgmtNumber
	}

	query := fmt.Sprintf(`
		INSERT INTO vehicles (
			mgmt_number, car_number, manufacturer, model_name, fuel_type,
			transmission, year, mileage, price, min_bid_price, location,
			organization, due_date, auction_count, status, image_urls, image_labels, detail_url,
			source, source_id, final_price, result_status, result_date,
			case_number, court_name, property_type,
			created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
			$19, $20, $21, $22, $23, $24, $25, $26,
			NOW(), NOW()
		)
		ON CONFLICT (source, source_id) DO UPDATE SET
			mgmt_number = COALESCE(EXCLUDED.mgmt_number, vehicles.mgmt_number),
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
			image_labels = COALESCE(EXCLUDED.image_labels, vehicles.image_labels),
			detail_url = COALESCE(EXCLUDED.detail_url, vehicles.detail_url),
			final_price = COALESCE(EXCLUDED.final_price, vehicles.final_price),
			result_status = COALESCE(EXCLUDED.result_status, vehicles.result_status),
			result_date = COALESCE(EXCLUDED.result_date, vehicles.result_date),
			case_number = COALESCE(EXCLUDED.case_number, vehicles.case_number),
			court_name = COALESCE(EXCLUDED.court_name, vehicles.court_name),
			property_type = COALESCE(EXCLUDED.property_type, vehicles.property_type),
			updated_at = NOW()
		RETURNING %s
	`, vehicleColumns)

	v, err := scanVehicle(r.pool.QueryRow(ctx, query,
		req.MgmtNumber, req.CarNumber, req.Manufacturer, req.ModelName, req.FuelType,
		req.Transmission, req.Year, req.Mileage, req.Price, req.MinBidPrice,
		req.Location, req.Organization, dueDate, req.AuctionCount, req.Status,
		req.ImageURLs, req.ImageLabels, req.DetailURL,
		source, sourceID, req.FinalPrice, req.ResultStatus, resultDate,
		req.CaseNumber, req.CourtName, req.PropertyType,
	))
	if err != nil {
		return nil, fmt.Errorf("failed to upsert vehicle: %w", err)
	}

	return v, nil
}

func (r *VehicleRepository) GetVehicleHistory(ctx context.Context, vehicleID int64) ([]models.AuctionHistoryEntry, error) {
	query := `
		SELECT id, vehicle_id, auction_round, listed_price, min_bid_price,
		       final_price, status, bid_deadline, result_date, recorded_at
		FROM auction_history
		WHERE vehicle_id = $1
		ORDER BY recorded_at DESC
	`

	rows, err := r.pool.Query(ctx, query, vehicleID)
	if err != nil {
		return nil, fmt.Errorf("failed to query auction history: %w", err)
	}
	defer rows.Close()

	entries := make([]models.AuctionHistoryEntry, 0)
	for rows.Next() {
		var e models.AuctionHistoryEntry
		if err := rows.Scan(
			&e.ID, &e.VehicleID, &e.AuctionRound, &e.ListedPrice,
			&e.MinBidPrice, &e.FinalPrice, &e.Status, &e.BidDeadline,
			&e.ResultDate, &e.RecordedAt,
		); err != nil {
			return nil, fmt.Errorf("failed to scan auction history: %w", err)
		}
		entries = append(entries, e)
	}

	return entries, nil
}

func (r *VehicleRepository) GetSources(ctx context.Context) ([]models.SourceInfo, error) {
	sourceNames := map[string]string{
		"automart":      "오토마트 공매",
		"court_auction": "법원경매",
		"onbid":         "온비드",
	}

	query := `
		SELECT source, COUNT(*)
		FROM vehicles
		GROUP BY source
		ORDER BY COUNT(*) DESC
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query sources: %w", err)
	}
	defer rows.Close()

	sources := make([]models.SourceInfo, 0)
	for rows.Next() {
		var s models.SourceInfo
		if err := rows.Scan(&s.Source, &s.Count); err != nil {
			return nil, fmt.Errorf("failed to scan source: %w", err)
		}
		if name, ok := sourceNames[s.Source]; ok {
			s.Name = name
		} else {
			s.Name = s.Source
		}
		sources = append(sources, s)
	}

	return sources, nil
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

	// By source
	rows, err = r.pool.Query(ctx, `
		SELECT source, COUNT(*), COALESCE(AVG(price), 0)
		FROM vehicles
		WHERE source IS NOT NULL
		GROUP BY source
		ORDER BY COUNT(*) DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to get source stats: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var ss models.SourceStats
		if err := rows.Scan(&ss.Source, &ss.Count, &ss.AvgPrice); err != nil {
			return nil, fmt.Errorf("failed to scan source stats: %w", err)
		}
		stats.BySource = append(stats.BySource, ss)
	}

	// Completed auction stats
	err = r.pool.QueryRow(ctx, `
		SELECT
			COUNT(*),
			COALESCE(AVG(final_price), 0)
		FROM vehicles
		WHERE result_status IN ('매각', '유찰')
	`).Scan(&stats.CompletedCount, &stats.AvgFinalPrice)
	if err != nil {
		return nil, fmt.Errorf("failed to get completed stats: %w", err)
	}

	// Sale rate
	if stats.CompletedCount > 0 {
		var soldCount int64
		err = r.pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM vehicles WHERE result_status = '매각'
		`).Scan(&soldCount)
		if err != nil {
			return nil, fmt.Errorf("failed to get sale count: %w", err)
		}
		stats.SaleRate = float64(soldCount) / float64(stats.CompletedCount) * 100
	}

	return stats, nil
}

func (r *VehicleRepository) GetInspectionByVehicleID(ctx context.Context, vehicleID int64) (*models.VehicleInspection, error) {
	query := `
		SELECT id, vehicle_id, inspection_date, vin, displacement,
		       mileage_at_inspection, color, drive_type, report_data,
		       report_url, scraped_at, created_at, updated_at
		FROM vehicle_inspections
		WHERE vehicle_id = $1
	`

	var ins models.VehicleInspection
	err := r.pool.QueryRow(ctx, query, vehicleID).Scan(
		&ins.ID, &ins.VehicleID, &ins.InspectionDate, &ins.VIN,
		&ins.Displacement, &ins.MileageAtInspection, &ins.Color,
		&ins.DriveType, &ins.ReportData, &ins.ReportURL,
		&ins.ScrapedAt, &ins.CreatedAt, &ins.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get vehicle inspection: %w", err)
	}

	return &ins, nil
}

func (r *VehicleRepository) FindByCarNumber(ctx context.Context, carNumber string) ([]models.Vehicle, error) {
	query := fmt.Sprintf(`SELECT %s FROM vehicles WHERE car_number = $1 ORDER BY created_at DESC`, vehicleColumns)

	rows, err := r.pool.Query(ctx, query, carNumber)
	if err != nil {
		return nil, fmt.Errorf("failed to find vehicles by car number: %w", err)
	}
	defer rows.Close()

	vehicles := make([]models.Vehicle, 0)
	for rows.Next() {
		v, err := scanVehicleFromRows(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan vehicle: %w", err)
		}
		vehicles = append(vehicles, v)
	}

	return vehicles, nil
}

func (r *VehicleRepository) GetExternalInfo(ctx context.Context, carNumber string) (*models.VehicleExternalInfo, error) {
	query := `SELECT id, car_number, data, source, fetched_at, created_at, updated_at
		FROM vehicle_external_info WHERE car_number = $1 ORDER BY fetched_at DESC LIMIT 1`

	var info models.VehicleExternalInfo
	err := r.pool.QueryRow(ctx, query, carNumber).Scan(
		&info.ID, &info.CarNumber, &info.Data, &info.Source,
		&info.FetchedAt, &info.CreatedAt, &info.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get external info: %w", err)
	}

	return &info, nil
}

func (r *VehicleRepository) UpsertExternalInfo(ctx context.Context, info models.VehicleExternalInfo) (*models.VehicleExternalInfo, error) {
	query := `INSERT INTO vehicle_external_info (car_number, data, source, fetched_at, created_at, updated_at)
		VALUES ($1, $2, $3, NOW(), NOW(), NOW())
		ON CONFLICT (car_number, source) DO UPDATE SET
			data = EXCLUDED.data,
			fetched_at = NOW(),
			updated_at = NOW()
		RETURNING id, car_number, data, source, fetched_at, created_at, updated_at`

	var result models.VehicleExternalInfo
	err := r.pool.QueryRow(ctx, query, info.CarNumber, info.Data, info.Source).Scan(
		&result.ID, &result.CarNumber, &result.Data, &result.Source,
		&result.FetchedAt, &result.CreatedAt, &result.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert external info: %w", err)
	}

	return &result, nil
}

func (r *VehicleRepository) UpsertInspection(ctx context.Context, req models.VehicleInspectionUpsertRequest) (*models.VehicleInspection, error) {
	// Resolve vehicle_id from source_id
	var vehicleID int64
	err := r.pool.QueryRow(ctx, `SELECT id FROM vehicles WHERE source_id = $1`, req.VehicleSourceID).Scan(&vehicleID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("vehicle not found for source_id: %s", req.VehicleSourceID)
		}
		return nil, fmt.Errorf("failed to resolve vehicle_id: %w", err)
	}

	var inspectionDate *time.Time
	if req.InspectionDate != nil && *req.InspectionDate != "" {
		parsed, err := time.Parse("2006-01-02", *req.InspectionDate)
		if err != nil {
			return nil, fmt.Errorf("invalid inspection_date format: %w", err)
		}
		inspectionDate = &parsed
	}

	reportData := json.RawMessage(req.ReportData)

	query := `
		INSERT INTO vehicle_inspections (
			vehicle_id, inspection_date, vin, displacement,
			mileage_at_inspection, color, drive_type, report_data,
			report_url, scraped_at, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW()
		)
		ON CONFLICT (vehicle_id) DO UPDATE SET
			inspection_date = COALESCE(EXCLUDED.inspection_date, vehicle_inspections.inspection_date),
			vin = COALESCE(EXCLUDED.vin, vehicle_inspections.vin),
			displacement = COALESCE(EXCLUDED.displacement, vehicle_inspections.displacement),
			mileage_at_inspection = COALESCE(EXCLUDED.mileage_at_inspection, vehicle_inspections.mileage_at_inspection),
			color = COALESCE(EXCLUDED.color, vehicle_inspections.color),
			drive_type = COALESCE(EXCLUDED.drive_type, vehicle_inspections.drive_type),
			report_data = EXCLUDED.report_data,
			report_url = COALESCE(EXCLUDED.report_url, vehicle_inspections.report_url),
			scraped_at = NOW(),
			updated_at = NOW()
		RETURNING id, vehicle_id, inspection_date, vin, displacement,
		          mileage_at_inspection, color, drive_type, report_data,
		          report_url, scraped_at, created_at, updated_at
	`

	var ins models.VehicleInspection
	err = r.pool.QueryRow(ctx, query,
		vehicleID, inspectionDate, req.VIN, req.Displacement,
		req.MileageAtInspection, req.Color, req.DriveType, reportData,
		req.ReportURL,
	).Scan(
		&ins.ID, &ins.VehicleID, &ins.InspectionDate, &ins.VIN,
		&ins.Displacement, &ins.MileageAtInspection, &ins.Color,
		&ins.DriveType, &ins.ReportData, &ins.ReportURL,
		&ins.ScrapedAt, &ins.CreatedAt, &ins.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to upsert vehicle inspection: %w", err)
	}

	return &ins, nil
}

func (r *VehicleRepository) GetMarketMappings(ctx context.Context) (*models.MarketMappings, error) {
	result := &models.MarketMappings{
		Manufacturers: make([]models.MarketManufacturerMapping, 0),
		FuelTypes:     make([]models.MarketFuelMapping, 0),
		Models:        make([]models.MarketModelMapping, 0),
	}

	// Manufacturers
	rows, err := r.pool.Query(ctx, `
		SELECT id, internal_name, korean_name, is_foreign, kcar_code, encar_name
		FROM market_manufacturer_mappings
		ORDER BY id
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query manufacturer mappings: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var m models.MarketManufacturerMapping
		if err := rows.Scan(&m.ID, &m.InternalName, &m.KoreanName, &m.IsForeign, &m.KcarCode, &m.EncarName); err != nil {
			return nil, fmt.Errorf("failed to scan manufacturer mapping: %w", err)
		}
		result.Manufacturers = append(result.Manufacturers, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating manufacturer mappings: %w", err)
	}

	// Fuel types
	fuelRows, err := r.pool.Query(ctx, `
		SELECT id, internal_name, encar_name, kcar_code
		FROM market_fuel_mappings
		ORDER BY id
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query fuel mappings: %w", err)
	}
	defer fuelRows.Close()
	for fuelRows.Next() {
		var m models.MarketFuelMapping
		if err := fuelRows.Scan(&m.ID, &m.InternalName, &m.EncarName, &m.KcarCode); err != nil {
			return nil, fmt.Errorf("failed to scan fuel mapping: %w", err)
		}
		result.FuelTypes = append(result.FuelTypes, m)
	}
	if err := fuelRows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating fuel mappings: %w", err)
	}

	// Models
	modelRows, err := r.pool.Query(ctx, `
		SELECT id, internal_name, manufacturer_korean, encar_model_group, kcar_model_code
		FROM market_model_mappings
		ORDER BY id
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to query model mappings: %w", err)
	}
	defer modelRows.Close()
	for modelRows.Next() {
		var m models.MarketModelMapping
		if err := modelRows.Scan(&m.ID, &m.InternalName, &m.ManufacturerKorean, &m.EncarModelGroup, &m.KcarModelCode); err != nil {
			return nil, fmt.Errorf("failed to scan model mapping: %w", err)
		}
		result.Models = append(result.Models, m)
	}
	if err := modelRows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating model mappings: %w", err)
	}

	return result, nil
}
