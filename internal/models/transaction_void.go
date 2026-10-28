package models

import (
	"time"
)

type TransactionVoid struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID        uint      `gorm:"not null;index" json:"store_id"`
	TransactionID  uint      `gorm:"not null;uniqueIndex" json:"transaction_id"`
	AuthorizedByID uint      `gorm:"not null" json:"authorized_by_id"`
	Reason         string    `gorm:"type:text;not null" json:"reason"`
	CreatedAt      time.Time `gorm:"autoCreateTime" json:"created_at"`
}
