package models

import (
	"time"
)

type Transaction struct {
	ID              uint                 `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID         uint                 `gorm:"not null" json:"store_id"`
	Type            string               `gorm:"type:transaction_type;not null" json:"type"`
	TotalAmount     int64                `gorm:"not null" json:"total_amount"`
	TotalCost       int64                `gorm:"not null" json:"total_cost"`
	Description     *string              `gorm:"type:text" json:"description"`
	ExpenseCategory *string              `gorm:"type:expense_category" json:"expense_category"`
	CorrelationID   *string              `gorm:"type:varchar(255)" json:"correlation_id"`
	Items           []TransactionItem    `gorm:"foreignKey:TransactionID" json:"items,omitempty"`
	Payments        []TransactionPayment `gorm:"foreignKey:TransactionID" json:"payments,omitempty"`
	OccurredAt      time.Time            `gorm:"not null" json:"occurred_at"`
	CreatedAt       time.Time            `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time            `gorm:"autoUpdateTime" json:"updated_at"`
}
