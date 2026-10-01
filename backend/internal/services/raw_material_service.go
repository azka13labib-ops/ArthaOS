package services

import (
	"app/internal/models"
	"app/internal/repository"
)

type RawMaterialService interface {
	Create(storeID uint, name, sku, unit string, costPerUnit int64, currentStock int) (*models.RawMaterial, error)
	GetAll(storeID uint) ([]models.RawMaterial, error)
	GetByID(storeID, id uint) (*models.RawMaterial, error)
	UpdateStock(storeID, id uint, quantityDelta int) error
}

type rawMaterialService struct {
	rmRepo repository.RawMaterialRepository
}

func NewRawMaterialService(rmRepo repository.RawMaterialRepository) RawMaterialService {
	return &rawMaterialService{rmRepo: rmRepo}
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

func (s *rawMaterialService) UpdateStock(storeID, id uint, quantityDelta int) error {
	rm, err := s.rmRepo.GetByID(storeID, id)
	if err != nil {
		return err
	}
	rm.CurrentStock += quantityDelta
	return s.rmRepo.Update(rm)
}
