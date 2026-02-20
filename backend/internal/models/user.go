package models

import "time"

type User struct {
	ID                int64      `json:"id"`
	Email             string     `json:"email"`
	PasswordHash      string     `json:"-"`
	Name              string     `json:"name"`
	EmailVerified     bool       `json:"email_verified"`
	EmailVerifiedAt   *time.Time `json:"email_verified_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type EmailVerificationToken struct {
	ID        int64      `json:"id"`
	UserID    int64      `json:"user_id"`
	Token     string     `json:"token"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name" binding:"required,min=2,max=100"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
	User        User   `json:"user"`
}

type RegisterResponse struct {
	EmailVerificationSent bool   `json:"email_verification_sent"`
	Email                 string `json:"email"`
	User                  User   `json:"user"`
	AccessToken           string `json:"access_token"`
	ExpiresIn             int    `json:"expires_in"`
}

type Favorite struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	VehicleID int64     `json:"vehicle_id"`
	CreatedAt time.Time `json:"created_at"`
}

type UserContext struct {
	UserID int64  `json:"user_id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
}

type FavoritesCheckResponse struct {
	Favorites map[int64]bool `json:"favorites"`
}
