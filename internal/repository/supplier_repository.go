package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type SupplierRepository interface {
	Create(supplier *models.Supplier) error
	GetByStore(storeID uint) ([]models.Supplier, error)
	GetByID(id uint, storeID uint) (*models.Supplier, error)
	Update(supplier *models.Supplier) error
	Delete(id uint, storeID uint) error
}

type supplierRepository struct {
	db *gorm.DB
}

func NewSupplierRepository(db *gorm.DB) SupplierRepository {
	return &supplierRepository{db}
}

func (r *supplierRepository) Create(supplier *models.Supplier) error {
	return r.db.Create(supplier).Error
}

func (r *supplierRepository) GetByStore(storeID uint) ([]models.Supplier, error) {
	var suppliers []models.Supplier
	err := r.db.Where("store_id = ?", storeID).Order("name ASC").Find(&suppliers).Error
	return suppliers, err
}

func (r *supplierRepository) GetByID(id uint, storeID uint) (*models.Supplier, error) {
	var supplier models.Supplier
	err := r.db.Where("id = ? AND store_id = ?", id, storeID).First(&supplier).Error
	if err != nil {
		return nil, err
	}
	return &supplier, nil
}

func (r *supplierRepository) Update(supplier *models.Supplier) error {
	return r.db.Save(supplier).Error
}

func (r *supplierRepository) Delete(id uint, storeID uint) error {
	return r.db.Where("id = ? AND store_id = ?", id, storeID).Delete(&models.Supplier{}).Error
}
