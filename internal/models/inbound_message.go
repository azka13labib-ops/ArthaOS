package models

import (
	"time"
)

type InboundMessage struct {
	ID                uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID           uint      `gorm:"not null" json:"store_id"`
	WhatsappAccountID uint      `gorm:"uniqueIndex:idx_wa_msg;not null" json:"whatsapp_account_id"`
	WhatsappMessageID string    `gorm:"type:varchar(255);uniqueIndex:idx_wa_msg;not null" json:"whatsapp_message_id"`
	SenderPhone       string    `gorm:"type:varchar(50);not null" json:"sender_phone"`
	MessageText       string    `gorm:"type:text;not null" json:"message_text"`
	ProcessingStatus  string    `gorm:"type:inbound_processing_status;not null" json:"processing_status"`
	RejectReason      *string   `gorm:"type:inbound_reject_reason" json:"reject_reason"`
	ReceivedAt        time.Time `gorm:"not null" json:"received_at"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
}
