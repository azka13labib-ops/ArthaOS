package models

import (
	"time"
)

type TransactionItem struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	TransactionID uint      `gorm:"not null" json:"transaction_id"`
	ProductID     uint      `gorm:"not null" json:"product_id"`
	Quantity      int       `gorm:"not null" json:"quantity"`
	CostPrice     int64     `gorm:"not null" json:"cost_price"`
	SellPrice     int64     `gorm:"not null" json:"sell_price"`
	Subtotal      int64     `gorm:"not null" json:"subtotal"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
}
