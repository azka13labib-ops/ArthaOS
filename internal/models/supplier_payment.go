package models

import "time"

type SupplierPayment struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID       uint      `gorm:"not null;index" json:"store_id"`
	PurchaseID    uint      `gorm:"not null;index" json:"purchase_id"`
	Amount        int64     `gorm:"not null" json:"amount"`
	PaymentMethod string    `gorm:"type:varchar(50);default:'cash';not null" json:"payment_method"` // 'cash', 'transfer'
	PaymentDate   time.Time `gorm:"not null" json:"payment_date"`
	Notes         string    `gorm:"type:text" json:"notes"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`

	Purchase      *Purchase `gorm:"foreignKey:PurchaseID" json:"purchase,omitempty"`
}
