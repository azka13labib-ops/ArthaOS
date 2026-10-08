package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type InventoryRepository interface {
	CreateMovement(tx *gorm.DB, movement *models.InventoryMovement) error
	GetMovementsByProduct(storeID uint, productID uint) ([]models.InventoryMovement, error)
}

type inventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) InventoryRepository {
	return &inventoryRepository{db}
}

func (r *inventoryRepository) CreateMovement(tx *gorm.DB, movement *models.InventoryMovement) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.Create(movement).Error
}

func (r *inventoryRepository) GetMovementsByProduct(storeID uint, productID uint) ([]models.InventoryMovement, error) {
	var movements []models.InventoryMovement
	err := r.db.Where("store_id = ? AND product_id = ?", storeID, productID).
		Order("created_at desc").
		Find(&movements).Error
	return movements, err
}
