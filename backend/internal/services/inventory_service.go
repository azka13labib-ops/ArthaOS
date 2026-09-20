package services

import (
	"errors"

	"app/internal/models"
	"app/internal/repository"

	"gorm.io/gorm"
)

type InventoryService interface {
	CreateProduct(storeID uint, name, sku string, barcode *string, buyPrice, sellPrice int64, initialStock int) (*models.Product, error)
	AdjustStock(storeID uint, productID uint, quantityDelta int, notes string) error
	GetProductMovements(storeID uint, productID uint) ([]models.InventoryMovement, error)
	GetProducts(storeID uint) ([]models.Product, error)
}

type inventoryService struct {
	db          *gorm.DB
	productRepo repository.ProductRepository
	invRepo     repository.InventoryRepository
}

func NewInventoryService(db *gorm.DB, productRepo repository.ProductRepository, invRepo repository.InventoryRepository) InventoryService {
	return &inventoryService{db, productRepo, invRepo}
}

func (s *inventoryService) CreateProduct(storeID uint, name, sku string, barcode *string, buyPrice, sellPrice int64, initialStock int) (*models.Product, error) {
	if initialStock < 0 {
		return nil, errors.New("initial stock cannot be negative")
	}

	product := &models.Product{
		StoreID:      storeID,
		Name:         name,
		SKU:          sku,
		Barcode:      barcode,
		BuyPrice:     buyPrice,
		SellPrice:    sellPrice,
		CurrentStock: initialStock,
		IsActive:     true,
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(product).Error; err != nil {
			return err
		}

		if initialStock > 0 {
			movement := &models.InventoryMovement{
				StoreID:       storeID,
				ProductID:     product.ID,
				MovementType:  "restock",
				QuantityDelta: initialStock,
				ReferenceType: "manual",
			}
			if err := s.invRepo.CreateMovement(tx, movement); err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return product, nil
}

func (s *inventoryService) AdjustStock(storeID uint, productID uint, quantityDelta int, notes string) error {
	if quantityDelta == 0 {
		return errors.New("quantity delta cannot be zero")
	}

	return s.db.Transaction(func(tx *gorm.DB) error {

		if quantityDelta < 0 {
			_, err := s.productRepo.UpdateStockWithLock(tx, productID, storeID, -quantityDelta)
			if err != nil {
				return err
			}
		} else {

			res := tx.Exec(`
				UPDATE products 
				SET current_stock = current_stock + $1, updated_at = NOW() 
				WHERE id = $2 AND store_id = $3 AND is_active = true
			`, quantityDelta, productID, storeID)
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return errors.New("product not found or inactive")
			}
		}

		movement := &models.InventoryMovement{
			StoreID:       storeID,
			ProductID:     productID,
			MovementType:  "adjustment",
			QuantityDelta: quantityDelta,
			ReferenceType: "manual",
			Notes:         &notes,
		}

		return s.invRepo.CreateMovement(tx, movement)
	})
}

func (s *inventoryService) GetProductMovements(storeID uint, productID uint) ([]models.InventoryMovement, error) {
	return s.invRepo.GetMovementsByProduct(storeID, productID)
}

func (s *inventoryService) GetProducts(storeID uint) ([]models.Product, error) {
	return s.productRepo.GetAllByStore(storeID)
}
