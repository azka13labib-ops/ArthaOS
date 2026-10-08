package models

import "time"

type Purchase struct {
	ID            uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID       uint           `gorm:"not null;index" json:"store_id"`
	SupplierID    *uint          `gorm:"index" json:"supplier_id"`
	InvoiceNumber string         `gorm:"type:varchar(100);not null" json:"invoice_number"`
	PurchaseDate  time.Time      `gorm:"not null" json:"purchase_date"`
	TotalAmount   int64          `gorm:"not null;default:0" json:"total_amount"`
	PaymentStatus string         `gorm:"type:varchar(50);default:'paid'" json:"payment_status"` // 'paid', 'pending'
	PaymentMethod string         `gorm:"type:varchar(50);default:'cash'" json:"payment_method"` // 'cash', 'transfer', 'debt'
	Notes         string         `gorm:"type:text" json:"notes"`
	CreatedAt     time.Time      `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time      `gorm:"autoUpdateTime" json:"updated_at"`

	Supplier      *Supplier      `gorm:"foreignKey:SupplierID" json:"supplier,omitempty"`
	Items         []PurchaseItem `gorm:"foreignKey:PurchaseID;constraint:OnDelete:CASCADE" json:"items,omitempty"`
}

type PurchaseItem struct {
	ID            uint         `gorm:"primaryKey;autoIncrement" json:"id"`
	PurchaseID    uint         `gorm:"not null;index" json:"purchase_id"`
	ItemType      string       `gorm:"type:varchar(50);not null;default:'product'" json:"item_type"` // 'product', 'raw_material'
	ProductID     *uint        `gorm:"index" json:"product_id"`
	RawMaterialID *uint        `gorm:"index" json:"raw_material_id"`
	ItemName      string       `gorm:"type:varchar(255);not null" json:"item_name"`
	Quantity      int          `gorm:"not null" json:"quantity"`
	BuyPrice      int64        `gorm:"not null" json:"buy_price"`
	Subtotal      int64        `gorm:"not null" json:"subtotal"`
	CreatedAt     time.Time    `gorm:"autoCreateTime" json:"created_at"`

	Product       *Product     `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	RawMaterial   *RawMaterial `gorm:"foreignKey:RawMaterialID" json:"raw_material,omitempty"`
}
