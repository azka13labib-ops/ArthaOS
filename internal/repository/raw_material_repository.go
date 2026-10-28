package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type RawMaterialRepository interface {
	Create(rm *models.RawMaterial) error
	GetByID(storeID, id uint) (*models.RawMaterial, error)
	GetAll(storeID uint) ([]models.RawMaterial, error)
	Update(rm *models.RawMaterial) error
	AdjustStock(storeID, id uint, quantityDelta int) error
	Delete(storeID, id uint) error
}

type rawMaterialRepo struct {
	db *gorm.DB
}

func NewRawMaterialRepository(db *gorm.DB) RawMaterialRepository {
	return &rawMaterialRepo{db: db}
}

func (r *rawMaterialRepo) Create(rm *models.RawMaterial) error {
	return r.db.Create(rm).Error
}

func (r *rawMaterialRepo) GetByID(storeID, id uint) (*models.RawMaterial, error) {
	var rm models.RawMaterial
	err := r.db.Where("store_id = ? AND id = ?", storeID, id).First(&rm).Error
	return &rm, err
}

func (r *rawMaterialRepo) GetAll(storeID uint) ([]models.RawMaterial, error) {
	var rms []models.RawMaterial
	err := r.db.Where("store_id = ?", storeID).Find(&rms).Error
	return rms, err
}

func (r *rawMaterialRepo) Update(rm *models.RawMaterial) error {
	return r.db.Save(rm).Error
}

func (r *rawMaterialRepo) AdjustStock(storeID, id uint, quantityDelta int) error {
	result := r.db.Exec(`
		UPDATE raw_materials
		SET current_stock = current_stock + ?, updated_at = NOW()
		WHERE id = ? AND store_id = ? AND current_stock + ? >= 0
	`, quantityDelta, id, storeID, quantityDelta)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *rawMaterialRepo) Delete(storeID, id uint) error {
	return r.db.Where("store_id = ? AND id = ?", storeID, id).Delete(&models.RawMaterial{}).Error
}
