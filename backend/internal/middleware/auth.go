package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jelly/auto-auction/backend/internal/config"
	"github.com/jelly/auto-auction/backend/internal/models"
)

const UserContextKey = "user"

type JWTClaims struct {
	UserID int64  `json:"user_id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	jwt.RegisteredClaims
}

func JWTMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try Authorization header first
		authHeader := c.GetHeader("Authorization")
		var tokenString string
		
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		} else {
			// Try cookie
			tokenString, _ = c.Cookie("access_token")
		}
		
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized", "code": "UNAUTHORIZED"})
			c.Abort()
			return
		}
		
		claims, err := ValidateAccessToken(tokenString, cfg)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token", "code": "INVALID_TOKEN"})
			c.Abort()
			return
		}
		
		c.Set(UserContextKey, claims)
		c.Next()
	}
}

func GenerateAccessToken(user *models.User, cfg *config.Config) (string, error) {
	claims := JWTClaims{
		UserID: user.ID,
		Email:  user.Email,
		Name:   user.Name,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(cfg.JWTAccessExpiry())),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "auto-auction",
		},
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func GenerateRefreshToken(userID int64, cfg *config.Config) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   string(rune(userID)),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(cfg.JWTRefreshExpiry())),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    "auto-auction",
	}
	
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTRefreshSecret))
}

func ValidateAccessToken(tokenString string, cfg *config.Config) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(cfg.JWTSecret), nil
	})
	
	if err != nil {
		return nil, err
	}
	
	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}
	
	return nil, jwt.ErrSignatureInvalid
}

func ValidateRefreshToken(tokenString string, cfg *config.Config) (int64, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(cfg.JWTRefreshSecret), nil
	})
	
	if err != nil {
		return 0, err
	}
	
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if sub, ok := claims["sub"].(string); ok {
			var userID int64
			_, err := strings.NewReader(sub).Read(make([]byte, 0))
			if err != nil {
				return 0, err
			}
			// Parse userID from subject
			return userID, nil
		}
	}
	
	return 0, jwt.ErrSignatureInvalid
}

func GetUserFromContext(c *gin.Context) *JWTClaims {
	if user, exists := c.Get(UserContextKey); exists {
		if claims, ok := user.(*JWTClaims); ok {
			return claims
		}
	}
	return nil
}

func SetAuthCookies(c *gin.Context, accessToken string, cfg *config.Config) {
	// Access token cookie
	c.SetCookie(
		"access_token",
		accessToken,
		cfg.JWTAccessExpiryMins*60,
		"/",
		cfg.CookieDomain,
		cfg.CookieSecure,
		true, // HttpOnly
	)
}

func ClearAuthCookies(c *gin.Context, cfg *config.Config) {
	c.SetCookie("access_token", "", -1, "/", cfg.CookieDomain, cfg.CookieSecure, true)
	c.SetCookie("refresh_token", "", -1, "/", cfg.CookieDomain, cfg.CookieSecure, true)
}
