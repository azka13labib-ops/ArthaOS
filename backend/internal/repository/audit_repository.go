package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type AuditRepository interface {
	Log(tx *gorm.DB, storeID uint, actorType string, action string, entityType string, entityID uint, metadataJSON *string) error
}

type auditRepository struct{}

func NewAuditRepository() AuditRepository {
	return &auditRepository{}
}

func (r *auditRepository) Log(tx *gorm.DB, storeID uint, actorType string, action string, entityType string, entityID uint, metadataJSON *string) error {
	log := &models.AuditLog{
		StoreID:      storeID,
		ActorType:    actorType,
		Action:       action,
		EntityType:   entityType,
		EntityID:     entityID,
		MetadataJSON: metadataJSON,
	}
	return tx.Create(log).Error
}
