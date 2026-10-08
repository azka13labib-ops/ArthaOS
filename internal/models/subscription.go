package models

import (
	"time"
)

type Subscription struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID   uint      `gorm:"not null" json:"store_id"`
	Plan      string    `gorm:"type:subscription_plan;not null" json:"plan"`
	Status    string    `gorm:"type:subscription_status;not null" json:"status"`
	StartedAt time.Time `gorm:"not null" json:"started_at"`
	ExpiresAt time.Time `gorm:"not null" json:"expires_at"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
