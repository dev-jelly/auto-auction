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

func (h *StatsHandler) GetSources(c *gin.Context) {
	sources, err := h.repo.GetSources(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch sources",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, sources)
}
