package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type PurchaseRepository interface {
	Create(tx *gorm.DB, purchase *models.Purchase) error
	GetByStore(storeID uint, limit, offset int) ([]models.Purchase, int64, error)
	GetByID(id uint, storeID uint) (*models.Purchase, error)
}

type purchaseRepository struct {
	db *gorm.DB
}

func NewPurchaseRepository(db *gorm.DB) PurchaseRepository {
	return &purchaseRepository{db}
}

func (r *purchaseRepository) Create(tx *gorm.DB, purchase *models.Purchase) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.Create(purchase).Error
}

func (r *purchaseRepository) GetByStore(storeID uint, limit, offset int) ([]models.Purchase, int64, error) {
	var purchases []models.Purchase
	var count int64

	q := r.db.Model(&models.Purchase{}).Where("store_id = ?", storeID)
	if err := q.Count(&count).Error; err != nil {
		return nil, 0, err
	}

	if limit <= 0 {
		limit = 50
	}

	err := q.Preload("Supplier").
		Preload("Items.Product").
		Preload("Items.RawMaterial").
		Order("purchase_date DESC, id DESC").
		Limit(limit).
		Offset(offset).
		Find(&purchases).Error

	return purchases, count, err
}

func (r *purchaseRepository) GetByID(id uint, storeID uint) (*models.Purchase, error) {
	var purchase models.Purchase
	err := r.db.Where("id = ? AND store_id = ?", id, storeID).
		Preload("Supplier").
		Preload("Items.Product").
		Preload("Items.RawMaterial").
		First(&purchase).Error
	if err != nil {
		return nil, err
	}
	return &purchase, nil
}
