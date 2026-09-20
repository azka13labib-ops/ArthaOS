package models

import (
	"time"
)

type Debt struct {
	ID              uint          `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID         uint          `gorm:"not null" json:"store_id"`
	CustomerID      uint          `gorm:"not null" json:"customer_id"`
	Customer        *Customer     `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	TransactionID   *uint         `json:"transaction_id"`
	Source          string        `gorm:"type:debt_source;not null" json:"source"`
	OriginalAmount  int64         `gorm:"not null" json:"original_amount"`
	RemainingAmount int64         `gorm:"not null" json:"remaining_amount"`
	Status          string        `gorm:"type:debt_status;not null" json:"status"`
	DueDate         *time.Time    `json:"due_date"`
	Payments        []DebtPayment `gorm:"foreignKey:DebtID" json:"payments,omitempty"`
	CreatedAt       time.Time     `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time     `gorm:"autoUpdateTime" json:"updated_at"`
}
