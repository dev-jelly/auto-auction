package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jelly/auto-auction/backend/internal/repository"
)

type MarketMappingsHandler struct {
	vehicleRepo *repository.VehicleRepository
}

func NewMarketMappingsHandler(vehicleRepo *repository.VehicleRepository) *MarketMappingsHandler {
	return &MarketMappingsHandler{vehicleRepo: vehicleRepo}
}

func (h *MarketMappingsHandler) GetMappings(c *gin.Context) {
	mappings, err := h.vehicleRepo.GetMarketMappings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch market mappings"})
		return
	}
	c.JSON(http.StatusOK, mappings)
}
