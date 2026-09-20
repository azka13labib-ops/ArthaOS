package models

import (
	"time"
)

type ConversationSession struct {
	ID                uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID           uint      `gorm:"not null" json:"store_id"`
	WhatsappAccountID uint      `gorm:"not null" json:"whatsapp_account_id"`
	PhoneNumber       string    `gorm:"type:varchar(50);not null" json:"phone_number"`
	State             string    `gorm:"type:conversation_state;not null" json:"state"`
	ContextJSON       *string   `gorm:"type:jsonb" json:"context_json"`
	ExpiresAt         time.Time `gorm:"not null" json:"expires_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
}
