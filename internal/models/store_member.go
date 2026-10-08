package models

import (
	"time"
)

type StoreMember struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID   uint      `gorm:"uniqueIndex:idx_store_user;not null" json:"store_id"`
	UserID    uint      `gorm:"uniqueIndex:idx_store_user;not null" json:"user_id"`
	Role      string    `gorm:"type:user_role;not null" json:"role"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}
