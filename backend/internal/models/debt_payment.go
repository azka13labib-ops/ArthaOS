package models

import (
	"time"
)

type DebtPayment struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	DebtID        uint      `gorm:"not null" json:"debt_id"`
	TransactionID uint      `gorm:"not null" json:"transaction_id"`
	Amount        int64     `gorm:"not null" json:"amount"`
	PaymentMethod string    `gorm:"type:payment_method;not null" json:"payment_method"`
	Notes         *string   `gorm:"type:text" json:"notes"`
	PaidAt        time.Time `gorm:"not null" json:"paid_at"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
}
