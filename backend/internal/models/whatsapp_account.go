package models

import (
	"time"
)

type WhatsappAccount struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID     uint      `gorm:"not null" json:"store_id"`
	PhoneNumber string    `gorm:"type:varchar(50);not null" json:"phone_number"`
	Provider    string    `gorm:"type:wa_provider;not null" json:"provider"`
	Status      string    `gorm:"type:wa_status;not null" json:"status"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
