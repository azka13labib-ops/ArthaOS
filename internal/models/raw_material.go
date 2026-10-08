package models

import "time"

type RawMaterial struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID      uint      `gorm:"uniqueIndex:idx_store_rm_sku;not null" json:"store_id"`
	Name         string    `gorm:"type:varchar(255);not null" json:"name"`
	SKU          string    `gorm:"type:varchar(100);uniqueIndex:idx_store_rm_sku;not null" json:"sku"`
	Unit         string    `gorm:"type:varchar(50);not null" json:"unit"` // e.g. gram, ml, pcs
	CostPerUnit  int64     `gorm:"not null" json:"cost_per_unit"`
	CurrentStock int       `gorm:"not null" json:"current_stock"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt    time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
