package models

import (
	"time"
)

type InventoryMovement struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID       uint      `gorm:"not null" json:"store_id"`
	ProductID     uint      `gorm:"not null" json:"product_id"`
	MovementType  string    `gorm:"type:inventory_movement_type;not null" json:"movement_type"`
	QuantityDelta int       `gorm:"not null" json:"quantity_delta"`
	ReferenceType string    `gorm:"type:inventory_reference_type;not null" json:"reference_type"`
	ReferenceID   *uint     `json:"reference_id"`
	Notes         *string   `gorm:"type:text" json:"notes"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
}
