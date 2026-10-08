package models

import (
	"time"
)

type Customer struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID     uint      `gorm:"not null" json:"store_id"`
	Name        string    `gorm:"type:varchar(255);not null" json:"name"`
	PhoneNumber *string   `gorm:"type:varchar(50)" json:"phone_number"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
