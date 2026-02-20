package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL           string
	Port                  string
	GinMode               string
	JWTSecret             string
	JWTRefreshSecret      string
	JWTAccessExpiryMins   int
	JWTRefreshExpiryDays  int
	CookieSecure          bool
	CookieDomain          string
	SMTPHost              string
	SMTPPort              int
	SMTPUser              string
	SMTPPassword          string
	SMTPFrom              string
	AppBaseURL            string
}

func Load() *Config {
	_ = godotenv.Load()

	cfg := &Config{
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://localhost:5432/auto_auction"),
		Port:                 getEnv("PORT", "8080"),
		GinMode:              getEnv("GIN_MODE", "debug"),
		JWTSecret:            getEnv("JWT_SECRET", "your-super-secret-key-change-in-production"),
		JWTRefreshSecret:     getEnv("JWT_REFRESH_SECRET", "your-refresh-secret-key-change-in-production"),
		JWTAccessExpiryMins:  getEnvInt("JWT_ACCESS_EXPIRY_MINS", 15),
		JWTRefreshExpiryDays: getEnvInt("JWT_REFRESH_EXPIRY_DAYS", 7),
		CookieSecure:         getEnvBool("COOKIE_SECURE", false),
		CookieDomain:         getEnv("COOKIE_DOMAIN", ""),
		SMTPHost:             getEnv("SMTP_HOST", "mailu-postfix.mailu.svc.cluster.local"),
		SMTPPort:             getEnvInt("SMTP_PORT", 587),
		SMTPUser:             getEnv("SMTP_USER", ""),
		SMTPPassword:         getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:             getEnv("SMTP_FROM", "noreply@octol.ing"),
		AppBaseURL:           getEnv("APP_BASE_URL", "https://auction.2msi.org"),
	}

	return cfg
}

func (c *Config) JWTAccessExpiry() time.Duration {
	return time.Duration(c.JWTAccessExpiryMins) * time.Minute
}

func (c *Config) JWTRefreshExpiry() time.Duration {
	return time.Duration(c.JWTRefreshExpiryDays) * 24 * time.Hour
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if i, err := strconv.Atoi(value); err == nil {
			return i
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if b, err := strconv.ParseBool(value); err == nil {
			return b
		}
	}
	return defaultValue
}
