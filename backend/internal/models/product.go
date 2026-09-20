package models

import (
	"time"
)

type Product struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID      uint      `gorm:"uniqueIndex:idx_store_sku;not null" json:"store_id"`
	Name         string    `gorm:"type:varchar(255);not null" json:"name"`
	SKU          string    `gorm:"type:varchar(100);uniqueIndex:idx_store_sku;not null" json:"sku"`
	Barcode      *string   `gorm:"type:varchar(100)" json:"barcode"`
	BuyPrice     int64     `gorm:"not null" json:"buy_price"`
	SellPrice    int64     `gorm:"not null" json:"sell_price"`
	CurrentStock int       `gorm:"not null" json:"current_stock"`
	IsActive     bool      `gorm:"default:true;not null" json:"is_active"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
