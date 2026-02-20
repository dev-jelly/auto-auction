package handlers

import (
	crypto_rand "crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jelly/auto-auction/backend/internal/config"
	"github.com/jelly/auto-auction/backend/internal/middleware"
	"github.com/jelly/auto-auction/backend/internal/models"
	"github.com/jelly/auto-auction/backend/internal/repository"
	"github.com/jelly/auto-auction/backend/internal/services"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo *repository.UserRepository
	cfg      *config.Config
	emailSvc *services.EmailService
}

func NewAuthHandler(userRepo *repository.UserRepository, cfg *config.Config, emailSvc *services.EmailService) *AuthHandler {
	return &AuthHandler{userRepo: userRepo, cfg: cfg, emailSvc: emailSvc}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	// Create user
	user, err := h.userRepo.Create(c.Request.Context(), req.Email, string(hashedPassword), req.Name)
	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			c.JSON(http.StatusConflict, gin.H{"error": "email already exists"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		}
		return
	}

	// Generate email verification token
	tokenBytes := make([]byte, 32)
	crypto_rand.Read(tokenBytes)
	verificationToken := hex.EncodeToString(tokenBytes)

	if err := h.userRepo.CreateVerificationToken(c.Request.Context(), user.ID, verificationToken, time.Now().Add(24*time.Hour)); err != nil {
		log.Printf("failed to create verification token for user %d: %v", user.ID, err)
	} else {
		go h.emailSvc.SendVerificationEmail(user.Email, user.Name, verificationToken)
	}

	// Generate access token
	accessToken, err := middleware.GenerateAccessToken(user, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	middleware.SetAuthCookies(c, accessToken, h.cfg)

	c.JSON(http.StatusCreated, models.RegisterResponse{
		EmailVerificationSent: true,
		Email:                 user.Email,
		User:                  *user,
		AccessToken:           accessToken,
		ExpiresIn:             h.cfg.JWTAccessExpiryMins * 60,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user by email
	user, err := h.userRepo.GetByEmail(c.Request.Context(), req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	// Generate tokens
	accessToken, err := middleware.GenerateAccessToken(user, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	middleware.SetAuthCookies(c, accessToken, h.cfg)

	c.JSON(http.StatusOK, models.TokenResponse{
		AccessToken: accessToken,
		ExpiresIn:   h.cfg.JWTAccessExpiryMins * 60,
		User:        *user,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	middleware.ClearAuthCookies(c, h.cfg)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (h *AuthHandler) Me(c *gin.Context) {
	claims := middleware.GetUserFromContext(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), claims.UserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	// Get refresh token from cookie
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "no refresh token"})
		return
	}

	userID, err := middleware.ValidateRefreshToken(refreshToken, h.cfg)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not found"})
		return
	}

	accessToken, err := middleware.GenerateAccessToken(user, h.cfg)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	middleware.SetAuthCookies(c, accessToken, h.cfg)

	c.JSON(http.StatusOK, models.TokenResponse{
		AccessToken: accessToken,
		ExpiresIn:   h.cfg.JWTAccessExpiryMins * 60,
		User:        *user,
	})
}

func (h *AuthHandler) OptionalAuth(c *gin.Context) {
	// Try to get user but don't block if not authenticated
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" && len(authHeader) > 7 {
		tokenString := authHeader[7:]
		claims, err := middleware.ValidateAccessToken(tokenString, h.cfg)
		if err == nil {
			c.Set(middleware.UserContextKey, claims)
		}
	}
	c.Next()
}

func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "token required"})
		return
	}
	vt, err := h.userRepo.GetVerificationToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired token"})
		return
	}
	if err := h.userRepo.MarkEmailVerified(c.Request.Context(), vt.UserID, vt.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verification failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "이메일 인증이 완료되었습니다"})
}

func (h *AuthHandler) ResendVerification(c *gin.Context) {
	claims := middleware.GetUserFromContext(c)
	if claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	user, err := h.userRepo.GetByID(c.Request.Context(), claims.UserID)
	if err != nil || user.EmailVerified {
		c.JSON(http.StatusBadRequest, gin.H{"error": "already verified or user not found"})
		return
	}
	tokenBytes := make([]byte, 32)
	crypto_rand.Read(tokenBytes)
	token := hex.EncodeToString(tokenBytes)
	h.userRepo.CreateVerificationToken(c.Request.Context(), user.ID, token, time.Now().Add(24*time.Hour))
	go h.emailSvc.SendVerificationEmail(user.Email, user.Name, token)
	c.JSON(http.StatusOK, gin.H{"message": "인증 이메일을 재발송했습니다"})
}
