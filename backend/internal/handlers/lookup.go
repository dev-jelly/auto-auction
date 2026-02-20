package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jelly/auto-auction/backend/internal/models"
	"github.com/jelly/auto-auction/backend/internal/repository"
)

type LookupHandler struct {
	repo *repository.VehicleRepository
}

func NewLookupHandler(repo *repository.VehicleRepository) *LookupHandler {
	return &LookupHandler{repo: repo}
}

func (h *LookupHandler) LookupCarNumber(c *gin.Context) {
	carNumber := c.Param("carNumber")
	if carNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Car number is required",
		})
		return
	}

	vehicles, err := h.repo.FindByCarNumber(c.Request.Context(), carNumber)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to lookup vehicles",
		})
		return
	}

	externalInfo, err := h.repo.GetExternalInfo(c.Request.Context(), carNumber)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to lookup external info",
		})
		return
	}

	car365URL := fmt.Sprintf("https://www.car365.go.kr/acat/catIntgVhclHist.do?carNo=%s", carNumber)

	response := models.CarNumberLookupResponse{
		Vehicles:     vehicles,
		ExternalInfo: externalInfo,
		Car365URL:    car365URL,
	}

	c.JSON(http.StatusOK, response)
}
