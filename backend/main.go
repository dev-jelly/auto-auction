package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jelly/auto-auction/backend/internal/config"
	"github.com/jelly/auto-auction/backend/internal/db"
	"github.com/jelly/auto-auction/backend/internal/handlers"
	"github.com/jelly/auto-auction/backend/internal/middleware"
	"github.com/jelly/auto-auction/backend/internal/repository"
	"github.com/jelly/auto-auction/backend/internal/services"
)

func main() {
	cfg := config.Load()

	gin.SetMode(cfg.GinMode)

	pool, err := db.NewPostgresPool(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	log.Println("Connected to PostgreSQL database")

	// Initialize repositories
	vehicleRepo := repository.NewVehicleRepository(pool)
	userRepo := repository.NewUserRepository(pool)
	favoritesRepo := repository.NewFavoritesRepository(pool)

	// Initialize services
	emailSvc := services.NewEmailService(cfg)

	// Initialize handlers
	vehicleHandler := handlers.NewVehicleHandler(vehicleRepo)
	lookupHandler := handlers.NewLookupHandler(vehicleRepo)
	statsHandler := handlers.NewStatsHandler(vehicleRepo)
	authHandler := handlers.NewAuthHandler(userRepo, cfg, emailSvc)
	favoritesHandler := handlers.NewFavoritesHandler(favoritesRepo, vehicleRepo)
	marketMappingsHandler := handlers.NewMarketMappingsHandler(vehicleRepo)

	router := gin.Default()

	router.Use(corsMiddleware())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	})

	api := router.Group("/api")
	{
		// Public vehicle routes
		api.GET("/vehicles", vehicleHandler.ListVehicles)
		api.GET("/vehicles/lookup/:carNumber", lookupHandler.LookupCarNumber)
		api.GET("/vehicles/:id", vehicleHandler.GetVehicle)
		api.GET("/vehicles/:id/history", vehicleHandler.GetVehicleHistory)
		api.GET("/vehicles/:id/inspection", vehicleHandler.GetVehicleInspection)
		api.GET("/stats", statsHandler.GetStats)
		api.GET("/sources", statsHandler.GetSources)
		api.GET("/market-mappings", marketMappingsHandler.GetMappings)

		// Public auth routes
		api.POST("/auth/register", authHandler.Register)
		api.POST("/auth/login", authHandler.Login)
		api.POST("/auth/logout", authHandler.Logout)
		api.POST("/auth/refresh", authHandler.Refresh)
		api.GET("/auth/verify-email", authHandler.VerifyEmail)

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.JWTMiddleware(cfg))
		{
			protected.GET("/auth/me", authHandler.Me)
			protected.POST("/auth/resend-verification", authHandler.ResendVerification)
			
			// Favorites
			protected.POST("/favorites/:vehicleId", favoritesHandler.Add)
			protected.DELETE("/favorites/:vehicleId", favoritesHandler.Remove)
			protected.GET("/favorites", favoritesHandler.List)
			protected.POST("/favorites/check", favoritesHandler.Check)
			protected.GET("/favorites/check/:vehicleId", favoritesHandler.IsFavorite)
		}

		// Admin routes (keep existing upsert)
		api.POST("/vehicles/upsert", vehicleHandler.UpsertVehicle)
		api.POST("/vehicles/inspection/upsert", vehicleHandler.UpsertVehicleInspection)
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
