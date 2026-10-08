package models

import "time"

type Supplier struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID   uint      `gorm:"not null;index" json:"store_id"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"`
	Phone     string    `gorm:"type:varchar(50)" json:"phone"`
	Email     string    `gorm:"type:varchar(100)" json:"email"`
	Address   string    `gorm:"type:text" json:"address"`
	Notes     string    `gorm:"type:text" json:"notes"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	Purchases []Purchase `gorm:"foreignKey:SupplierID" json:"purchases,omitempty"`
}
