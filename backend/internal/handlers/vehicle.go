package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jelly/auto-auction/backend/internal/models"
	"github.com/jelly/auto-auction/backend/internal/repository"
)

type VehicleHandler struct {
	repo *repository.VehicleRepository
}

func NewVehicleHandler(repo *repository.VehicleRepository) *VehicleHandler {
	return &VehicleHandler{repo: repo}
}

// ListVehicles godoc
// @Summary List vehicles
// @Description Get paginated list of vehicles with optional filters
// @Tags vehicles
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Items per page" default(20)
// @Param year query int false "Filter by year"
// @Param price_min query int false "Minimum price"
// @Param price_max query int false "Maximum price"
// @Param fuel_type query string false "Filter by fuel type"
// @Param status query string false "Filter by status"
// @Param sort_by query string false "Sort field" default(created_at)
// @Param sort_dir query string false "Sort direction" default(desc)
// @Success 200 {object} models.VehicleListResponse
// @Router /api/vehicles [get]
func (h *VehicleHandler) ListVehicles(c *gin.Context) {
	var params models.VehicleListParams
	if err := c.ShouldBindQuery(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid query parameters",
			"details": err.Error(),
		})
		return
	}

	result, err := h.repo.List(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch vehicles",
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetVehicle godoc
// @Summary Get vehicle by ID
// @Description Get a single vehicle by its ID
// @Tags vehicles
// @Accept json
// @Produce json
// @Param id path int true "Vehicle ID"
// @Success 200 {object} models.Vehicle
// @Router /api/vehicles/{id} [get]
func (h *VehicleHandler) GetVehicle(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid vehicle ID",
		})
		return
	}

	vehicle, err := h.repo.GetByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch vehicle",
		})
		return
	}

	if vehicle == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Vehicle not found",
		})
		return
	}

	c.JSON(http.StatusOK, vehicle)
}

// UpsertVehicle godoc
// @Summary Upsert vehicle
// @Description Create or update a vehicle by mgmt_number
// @Tags vehicles
// @Accept json
// @Produce json
// @Param vehicle body models.VehicleUpsertRequest true "Vehicle data"
// @Success 200 {object} models.Vehicle
// @Router /api/vehicles/upsert [post]
func (h *VehicleHandler) UpsertVehicle(c *gin.Context) {
	var req models.VehicleUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	vehicle, err := h.repo.Upsert(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to upsert vehicle",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, vehicle)
}
