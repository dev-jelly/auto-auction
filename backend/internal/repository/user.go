package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jelly/auto-auction/backend/internal/models"
)

type UserRepository struct {
	pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool}
}

func (r *UserRepository) Create(ctx context.Context, email, passwordHash, name string) (*models.User, error) {
	query := `
		INSERT INTO users (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING id, email, password_hash, name, email_verified, email_verified_at, created_at, updated_at
	`
	var user models.User
	err := r.pool.QueryRow(ctx, query, email, passwordHash, name).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.EmailVerified, &user.EmailVerifiedAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, name, email_verified, email_verified_at, created_at, updated_at
		FROM users WHERE email = $1
	`
	var user models.User
	err := r.pool.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.EmailVerified, &user.EmailVerifiedAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
	query := `
		SELECT id, email, password_hash, name, email_verified, email_verified_at, created_at, updated_at
		FROM users WHERE id = $1
	`
	var user models.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.EmailVerified, &user.EmailVerifiedAt, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) UpdateUpdatedAt(ctx context.Context, id int64) error {
	query := `UPDATE users SET updated_at = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, time.Now(), id)
	return err
}

func (r *UserRepository) CreateVerificationToken(ctx context.Context, userID int64, token string, expiresAt time.Time) error {
	query := `INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`
	_, err := r.pool.Exec(ctx, query, userID, token, expiresAt)
	return err
}

func (r *UserRepository) GetVerificationToken(ctx context.Context, token string) (*models.EmailVerificationToken, error) {
	query := `
		SELECT id, user_id, token, expires_at, used_at, created_at
		FROM email_verification_tokens
		WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()
	`
	var t models.EmailVerificationToken
	err := r.pool.QueryRow(ctx, query, token).Scan(
		&t.ID, &t.UserID, &t.Token, &t.ExpiresAt, &t.UsedAt, &t.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *UserRepository) MarkEmailVerified(ctx context.Context, userID int64, tokenID int64) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx,
		`UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1`, tokenID)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx,
		`UPDATE users SET email_verified = TRUE, email_verified_at = NOW() WHERE id = $1`, userID)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
