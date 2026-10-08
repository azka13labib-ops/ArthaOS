package models

import (
	"time"
)

type TransactionPayment struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	TransactionID uint      `gorm:"not null" json:"transaction_id"`
	CustomerID    *uint     `json:"customer_id"`
	PaymentMethod string    `gorm:"type:payment_method;not null" json:"payment_method"`
	Amount        int64     `gorm:"not null" json:"amount"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
}
