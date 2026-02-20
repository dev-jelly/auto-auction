package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jelly/auto-auction/backend/internal/middleware"
	"github.com/jelly/auto-auction/backend/internal/models"
	"github.com/jelly/auto-auction/backend/internal/repository"
)

type FavoritesHandler struct {
	favoritesRepo *repository.FavoritesRepository
	vehicleRepo   *repository.VehicleRepository
}

func NewFavoritesHandler(favoritesRepo *repository.FavoritesRepository, vehicleRepo *repository.VehicleRepository) *FavoritesHandler {
	return &FavoritesHandler{
		favoritesRepo: favoritesRepo,
		vehicleRepo:   vehicleRepo,
	}
}

func (h *FavoritesHandler) Add(c *gin.Context) {
	claims := middleware.GetUserFromContext(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	
	vehicleIDStr := c.Param("vehicleId")
	vehicleID, err := strconv.ParseInt(vehicleIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vehicle id"})
		return
	}
	
	// Check if vehicle exists
	_, err = h.vehicleRepo.GetByID(c.Request.Context(), vehicleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vehicle not found"})
		return
	}
	
	if err := h.favoritesRepo.Add(c.Request.Context(), claims.UserID, vehicleID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add favorite"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "added to favorites"})
}

func (h *FavoritesHandler) Remove(c *gin.Context) {
	claims := middleware.GetUserFromContext(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	
	vehicleIDStr := c.Param("vehicleId")
	vehicleID, err := strconv.ParseInt(vehicleIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vehicle id"})
		return
	}
	
	if err := h.favoritesRepo.Remove(c.Request.Context(), claims.UserID, vehicleID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to remove favorite"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "removed from favorites"})
}

func (h *FavoritesHandler) List(c *gin.Context) {
	claims := middleware.GetUserFromContext(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	response, err := h.favoritesRepo.List(c.Request.Context(), claims.UserID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get favorites"})
		return
	}
	
	c.JSON(http.StatusOK, response)
}

func (h *FavoritesHandler) Check(c *gin.Context) {
	claims := middleware.GetUserFromContext(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	
	var req struct {
		VehicleIDs []int64 `json:"vehicle_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	favorites, err := h.favoritesRepo.CheckBatch(c.Request.Context(), claims.UserID, req.VehicleIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check favorites"})
		return
	}
	
	c.JSON(http.StatusOK, models.FavoritesCheckResponse{Favorites: favorites})
}

func (h *FavoritesHandler) IsFavorite(c *gin.Context) {
	claims := middleware.GetUserFromContext(c)
	if claims == nil {
		c.JSON(http.StatusOK, gin.H{"is_favorite": false})
		return
	}
	
	vehicleIDStr := c.Param("vehicleId")
	vehicleID, err := strconv.ParseInt(vehicleIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid vehicle id"})
		return
	}
	
	isFavorite, err := h.favoritesRepo.IsFavorite(c.Request.Context(), claims.UserID, vehicleID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check favorite"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"is_favorite": isFavorite})
}
