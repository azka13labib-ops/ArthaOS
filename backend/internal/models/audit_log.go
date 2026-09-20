package models

import (
	"time"
)

type AuditLog struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	StoreID       uint      `gorm:"not null" json:"store_id"`
	ActorType     string    `gorm:"type:varchar(50);not null" json:"actor_type"`
	Action        string    `gorm:"type:varchar(100);not null" json:"action"`
	EntityType    string    `gorm:"type:varchar(100);not null" json:"entity_type"`
	EntityID      uint      `gorm:"not null" json:"entity_id"`
	CorrelationID *string   `gorm:"type:varchar(255)" json:"correlation_id"`
	MetadataJSON  *string   `gorm:"type:jsonb" json:"metadata_json"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
}
