package models

import (
	"time"
)

// PushSubscription stores Web Push API subscriptions for browser notifications.
type PushSubscription struct {
	ID       uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID   uint   `gorm:"not null;index"           json:"user_id"`
	StoreID  uint   `gorm:"not null;index"           json:"store_id"`
	Endpoint string `gorm:"type:text;not null"       json:"endpoint"`
	P256dh   string `gorm:"type:text;not null"       json:"p256dh"`
	Auth     string `gorm:"type:varchar(255);not null" json:"auth"`

	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
