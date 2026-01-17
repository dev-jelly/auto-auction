package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jelly/auto-auction/backend/internal/repository"
)

type StatsHandler struct {
	repo *repository.VehicleRepository
}

func NewStatsHandler(repo *repository.VehicleRepository) *StatsHandler {
	return &StatsHandler{repo: repo}
}

// GetStats godoc
// @Summary Get vehicle statistics
// @Description Get aggregated statistics about vehicles
// @Tags stats
// @Accept json
// @Produce json
// @Success 200 {object} models.Stats
// @Router /api/stats [get]
func (h *StatsHandler) GetStats(c *gin.Context) {
	stats, err := h.repo.GetStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch statistics",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, stats)
}
