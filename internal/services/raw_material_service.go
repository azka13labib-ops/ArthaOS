package services

import (
	"app/internal/models"
	"app/internal/repository"
	"errors"

	"gorm.io/gorm"
)

type RawMaterialService interface {
	Create(storeID uint, name, sku, unit string, costPerUnit int64, currentStock int) (*models.RawMaterial, error)
	GetAll(storeID uint) ([]models.RawMaterial, error)
	GetByID(storeID, id uint) (*models.RawMaterial, error)
	UpdateStock(storeID, id uint, quantityDelta int, notes string) error
}

type rawMaterialService struct {
	db      *gorm.DB
	rmRepo  repository.RawMaterialRepository
	invRepo repository.InventoryRepository
}

func NewRawMaterialService(db *gorm.DB, rmRepo repository.RawMaterialRepository, invRepo repository.InventoryRepository) RawMaterialService {
	return &rawMaterialService{db: db, rmRepo: rmRepo, invRepo: invRepo}
}

func (s *rawMaterialService) Create(storeID uint, name, sku, unit string, costPerUnit int64, currentStock int) (*models.RawMaterial, error) {
	rm := &models.RawMaterial{
		StoreID:      storeID,
		Name:         name,
		SKU:          sku,
		Unit:         unit,
		CostPerUnit:  costPerUnit,
		CurrentStock: currentStock,
	}
	err := s.rmRepo.Create(rm)
	return rm, err
}

func (s *rawMaterialService) GetAll(storeID uint) ([]models.RawMaterial, error) {
	return s.rmRepo.GetAll(storeID)
}

func (s *rawMaterialService) GetByID(storeID, id uint) (*models.RawMaterial, error) {
	return s.rmRepo.GetByID(storeID, id)
}

func (s *rawMaterialService) UpdateStock(storeID, id uint, quantityDelta int, notes string) error {
	if quantityDelta == 0 {
		return errors.New("quantity delta cannot be zero")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.rmRepo.AdjustStock(storeID, id, quantityDelta); err != nil {
			return err
		}

		rmID := id
		var notesPtr *string
		if notes != "" {
			notesPtr = &notes
		}

		movement := &models.InventoryMovement{
			StoreID:       storeID,
			RawMaterialID: &rmID,
			MovementType:  "adjustment",
			QuantityDelta: quantityDelta,
			ReferenceType: "manual",
			Notes:         notesPtr,
		}

		return s.invRepo.CreateMovement(tx, movement)
	})
}
