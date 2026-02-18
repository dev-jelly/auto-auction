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

func (h *VehicleHandler) GetVehicleHistory(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid vehicle ID",
		})
		return
	}

	history, err := h.repo.GetVehicleHistory(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch vehicle history",
		})
		return
	}

	c.JSON(http.StatusOK, history)
}

func (h *VehicleHandler) GetVehicleInspection(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid vehicle ID",
		})
		return
	}

	inspection, err := h.repo.GetInspectionByVehicleID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch vehicle inspection",
		})
		return
	}

	if inspection == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Inspection not found",
		})
		return
	}

	c.JSON(http.StatusOK, inspection)
}

func (h *VehicleHandler) UpsertVehicleInspection(c *gin.Context) {
	var req models.VehicleInspectionUpsertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	inspection, err := h.repo.UpsertInspection(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to upsert vehicle inspection",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, inspection)
}
