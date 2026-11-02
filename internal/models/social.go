package models

import (
	"time"
)

// StoreAIUsage tracks monthly AI caption generation and social posting quotas per store.
type StoreAIUsage struct {
	ID                   uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID              uint      `gorm:"not null;uniqueIndex:idx_store_ai_usage_month" json:"store_id"`
	YearMonth            string    `gorm:"type:varchar(7);not null;uniqueIndex:idx_store_ai_usage_month" json:"year_month"` // e.g. "2026-11"
	CaptionCount         int       `gorm:"default:0" json:"caption_count"`
	PostCount            int       `gorm:"default:0" json:"post_count"`
	CustomAIKeyEncrypted string    `gorm:"type:text" json:"-"`
	CustomAIProvider     string    `gorm:"type:varchar(30);default:''" json:"custom_ai_provider"`
	CreatedAt            time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// SocialAccount represents a connected social media account (e.g. Instagram Business/Creator).
type SocialAccount struct {
	ID                   uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID              uint       `gorm:"not null;index" json:"store_id"`
	Platform             string     `gorm:"type:varchar(30);default:'instagram';not null" json:"platform"`
	ExternalAccountID    string     `gorm:"type:varchar(100);not null" json:"external_account_id"`
	Username             string     `gorm:"type:varchar(100);not null" json:"username"`
	AccessTokenEncrypted string     `gorm:"type:text;not null" json:"-"`
	TokenExpiresAt       *time.Time `json:"token_expires_at"`
	Status               string     `gorm:"type:varchar(20);default:'active';not null" json:"status"` // active, expired, revoked
	CreatedAt            time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt            time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

// SocialPost represents an Instagram feed post (draft, scheduled, published, or failed).
type SocialPost struct {
	ID              uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID         uint       `gorm:"not null;index" json:"store_id"`
	SocialAccountID *uint      `gorm:"index" json:"social_account_id"`
	Caption         string     `gorm:"type:text;not null" json:"caption"`
	ImageURL        string     `gorm:"type:text;not null" json:"image_url"`
	Status          string     `gorm:"type:varchar(20);default:'draft';not null;index" json:"status"` // draft, scheduled, publishing, published, failed, cancelled
	ScheduledAt     *time.Time `gorm:"index" json:"scheduled_at"`
	PublishedAt     *time.Time `json:"published_at"`
	ExternalPostID  string     `gorm:"type:varchar(100)" json:"external_post_id"`
	ErrorMessage    string     `gorm:"type:text" json:"error_message"`
	AttemptCount    int        `gorm:"default:0" json:"attempt_count"`
	CreatedBy       uint       `gorm:"not null" json:"created_by"`
	CreatedAt       time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

// PosterTemplate represents the design structure definition for auto-generated social posters.
type PosterTemplate struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Category          string `json:"category"` // promo, new_product, education
	DefaultBrandColor string `json:"default_brand_color"`
	Description       string `json:"description"`
	AspectRatio       string `json:"aspect_ratio"` // "4:5"
	Width             int    `json:"width"`        // 1080
	Height            int    `json:"height"`       // 1350
}
