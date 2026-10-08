package models

import "time"

type RecipeItem struct {
	ID            uint         `gorm:"primaryKey;autoIncrement" json:"id"`
	ProductID     uint         `gorm:"uniqueIndex:idx_product_rm;not null" json:"product_id"`
	RawMaterialID uint         `gorm:"uniqueIndex:idx_product_rm;not null" json:"raw_material_id"`
	Quantity      int          `gorm:"not null" json:"quantity"` // amount of raw material needed
	CreatedAt     time.Time    `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time    `gorm:"autoUpdateTime" json:"updated_at"`
	
	RawMaterial   *RawMaterial `gorm:"foreignKey:RawMaterialID" json:"raw_material,omitempty"`
}
