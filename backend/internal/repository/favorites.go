package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jelly/auto-auction/backend/internal/models"
)

type FavoritesRepository struct {
	pool *pgxpool.Pool
}

func NewFavoritesRepository(pool *pgxpool.Pool) *FavoritesRepository {
	return &FavoritesRepository{pool: pool}
}

func (r *FavoritesRepository) Add(ctx context.Context, userID, vehicleID int64) error {
	query := `
		INSERT INTO user_favorites (user_id, vehicle_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, vehicle_id) DO NOTHING
	`
	_, err := r.pool.Exec(ctx, query, userID, vehicleID)
	return err
}

func (r *FavoritesRepository) Remove(ctx context.Context, userID, vehicleID int64) error {
	query := `DELETE FROM user_favorites WHERE user_id = $1 AND vehicle_id = $2`
	_, err := r.pool.Exec(ctx, query, userID, vehicleID)
	return err
}

func (r *FavoritesRepository) IsFavorite(ctx context.Context, userID, vehicleID int64) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM user_favorites WHERE user_id = $1 AND vehicle_id = $2)`
	var exists bool
	err := r.pool.QueryRow(ctx, query, userID, vehicleID).Scan(&exists)
	return exists, err
}

func (r *FavoritesRepository) GetFavoriteVehicleIDs(ctx context.Context, userID int64) ([]int64, error) {
	query := `SELECT vehicle_id FROM user_favorites WHERE user_id = $1`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func (r *FavoritesRepository) List(ctx context.Context, userID int64, page, limit int) (*models.VehicleListResponse, error) {
	offset := (page - 1) * limit

	// Count total
	var total int64
	countQuery := `SELECT COUNT(*) FROM user_favorites WHERE user_id = $1`
	if err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, err
	}

	// Get vehicles with pagination
	query := fmt.Sprintf(`
		SELECT v.id, v.mgmt_number, v.car_number, v.manufacturer, v.model_name, v.fuel_type,
			v.transmission, v.year, v.mileage, v.price, v.min_bid_price, v.location,
			v.organization, v.due_date, v.auction_count, v.status, v.image_urls,
			v.detail_url, v.source, v.source_id, v.final_price, v.result_status, v.result_date,
			v.case_number, v.court_name, v.property_type, v.created_at, v.updated_at
		FROM vehicles v
		INNER JOIN user_favorites uf ON v.id = uf.vehicle_id
		WHERE uf.user_id = $1
		ORDER BY uf.created_at DESC
		LIMIT $2 OFFSET $3
	`)

	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vehicles []models.Vehicle
	for rows.Next() {
		v, err := scanVehicleFromRows(rows)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, v)
	}

	if vehicles == nil {
		vehicles = []models.Vehicle{}
	}

	return &models.VehicleListResponse{
		Data: vehicles,
		Pagination: models.Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: int((total + int64(limit) - 1) / int64(limit)),
		},
	}, nil
}

func (r *FavoritesRepository) CheckBatch(ctx context.Context, userID int64, vehicleIDs []int64) (map[int64]bool, error) {
	if len(vehicleIDs) == 0 {
		return map[int64]bool{}, nil
	}

	query := `SELECT vehicle_id FROM user_favorites WHERE user_id = $1 AND vehicle_id = ANY($2)`
	rows, err := r.pool.Query(ctx, query, userID, vehicleIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[int64]bool)
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		result[id] = true
	}

	// Initialize all requested IDs to false if not favorited
	for _, id := range vehicleIDs {
		if _, exists := result[id]; !exists {
			result[id] = false
		}
	}

	return result, nil
}
