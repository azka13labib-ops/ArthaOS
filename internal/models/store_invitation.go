package models

import (
	"time"
)

// StoreInvitation represents a pending invitation for a user to join a store.
type StoreInvitation struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID   uint      `gorm:"not null;index"           json:"store_id"`
	InvitedBy uint      `gorm:"not null"                 json:"invited_by"`
	Email     string    `gorm:"type:varchar(255);not null;index" json:"email"`
	Role      string    `gorm:"type:varchar(50);not null"        json:"role"`
	Token     string    `gorm:"type:varchar(255);uniqueIndex;not null" json:"token"`
	ExpiresAt time.Time `gorm:"not null"                         json:"expires_at"`
	AcceptedAt *time.Time `gorm:"type:timestamp"                 json:"accepted_at"`
	CreatedAt time.Time `gorm:"autoCreateTime"                   json:"created_at"`
}
