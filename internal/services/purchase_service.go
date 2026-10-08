package services

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"app/internal/models"
	"app/internal/repository"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CreatePurchaseItemRequest struct {
	ItemType      string `json:"item_type"` // "product" or "raw_material"
	ProductID     *uint  `json:"product_id"`
	RawMaterialID *uint  `json:"raw_material_id"`
	ItemName      string `json:"item_name"`
	Quantity      int    `json:"quantity"`
	BuyPrice      int64  `json:"buy_price"`
}

type CreatePurchaseRequest struct {
	SupplierID    *uint                       `json:"supplier_id"`
	InvoiceNumber string                      `json:"invoice_number"`
	PurchaseDate  string                      `json:"purchase_date"`
	PaymentStatus string                      `json:"payment_status"` // "paid", "pending"
	PaymentMethod string                      `json:"payment_method"` // "cash", "transfer", "debt"
	Notes         string                      `json:"notes"`
	Items         []CreatePurchaseItemRequest `json:"items"`
}

type PurchaseService interface {
	Create(storeID uint, req CreatePurchaseRequest) (*models.Purchase, error)
	List(storeID uint, limit, offset int) ([]models.Purchase, int64, error)
	GetByID(id uint, storeID uint) (*models.Purchase, error)
}

type purchaseService struct {
	db           *gorm.DB
	purchaseRepo repository.PurchaseRepository
}

func NewPurchaseService(db *gorm.DB, purchaseRepo repository.PurchaseRepository) PurchaseService {
	return &purchaseService{
		db:           db,
		purchaseRepo: purchaseRepo,
	}
}

func (s *purchaseService) Create(storeID uint, req CreatePurchaseRequest) (*models.Purchase, error) {
	if len(req.Items) == 0 {
		return nil, errors.New("faktur pembelian harus memiliki minimal 1 item barang")
	}

	for _, item := range req.Items {
		if item.Quantity <= 0 {
			return nil, errors.New("kuantitas barang harus lebih dari 0")
		}
		if item.BuyPrice < 0 {
			return nil, errors.New("harga beli barang tidak valid")
		}
	}

	invoiceNo := strings.TrimSpace(req.InvoiceNumber)
	if invoiceNo == "" {
		invoiceNo = fmt.Sprintf("PO-%s-%d", time.Now().Format("20060102150405"), storeID)
	}

	purchaseDate := time.Now()
	if req.PurchaseDate != "" {
		if t, err := time.Parse(time.RFC3339, req.PurchaseDate); err == nil {
			purchaseDate = t
		} else if t, err := time.Parse("2006-01-02", req.PurchaseDate); err == nil {
			purchaseDate = t
		}
	}

	paymentStatus := strings.ToLower(strings.TrimSpace(req.PaymentStatus))
	if paymentStatus == "" {
		paymentStatus = "paid"
	}

	paymentMethod := strings.ToLower(strings.TrimSpace(req.PaymentMethod))
	if paymentMethod == "" {
		paymentMethod = "cash"
	}

	var purchase *models.Purchase

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var totalAmount int64
		var purchaseItems []models.PurchaseItem

		for _, it := range req.Items {
			subtotal := it.BuyPrice * int64(it.Quantity)
			totalAmount += subtotal

			pItem := models.PurchaseItem{
				ItemType:      it.ItemType,
				ProductID:     it.ProductID,
				RawMaterialID: it.RawMaterialID,
				ItemName:      it.ItemName,
				Quantity:      it.Quantity,
				BuyPrice:      it.BuyPrice,
				Subtotal:      subtotal,
			}
			purchaseItems = append(purchaseItems, pItem)
		}

		purchase = &models.Purchase{
			StoreID:       storeID,
			SupplierID:    req.SupplierID,
			InvoiceNumber: invoiceNo,
			PurchaseDate:  purchaseDate,
			TotalAmount:   totalAmount,
			PaymentStatus: paymentStatus,
			PaymentMethod: paymentMethod,
			Notes:         strings.TrimSpace(req.Notes),
		}

		if err := tx.Create(purchase).Error; err != nil {
			return err
		}

		for idx := range purchaseItems {
			purchaseItems[idx].PurchaseID = purchase.ID
			if err := tx.Create(&purchaseItems[idx]).Error; err != nil {
				return err
			}

			it := purchaseItems[idx]
			noteText := fmt.Sprintf("Pembelian Faktur %s", invoiceNo)

			if it.ItemType == "raw_material" && it.RawMaterialID != nil {
				var rm models.RawMaterial
				if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
					Where("id = ? AND store_id = ?", *it.RawMaterialID, storeID).
					First(&rm).Error; err != nil {
					return fmt.Errorf("bahan baku ID %d tidak ditemukan: %w", *it.RawMaterialID, err)
				}

				rm.CurrentStock += it.Quantity
				if it.BuyPrice > 0 {
					rm.CostPerUnit = it.BuyPrice
				}
				if err := tx.Save(&rm).Error; err != nil {
					return err
				}

				movement := models.InventoryMovement{
					StoreID:       storeID,
					RawMaterialID: it.RawMaterialID,
					MovementType:  "restock",
					QuantityDelta: it.Quantity,
					ReferenceType: "purchase",
					ReferenceID:   &purchase.ID,
					Notes:         &noteText,
				}
				if err := tx.Create(&movement).Error; err != nil {
					return err
				}
			} else if it.ProductID != nil {
				var prod models.Product
				if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
					Where("id = ? AND store_id = ?", *it.ProductID, storeID).
					First(&prod).Error; err != nil {
					return fmt.Errorf("produk ID %d tidak ditemukan: %w", *it.ProductID, err)
				}

				prod.CurrentStock += it.Quantity
				if it.BuyPrice > 0 {
					prod.BuyPrice = it.BuyPrice
				}
				if err := tx.Save(&prod).Error; err != nil {
					return err
				}

				movement := models.InventoryMovement{
					StoreID:       storeID,
					ProductID:     it.ProductID,
					MovementType:  "restock",
					QuantityDelta: it.Quantity,
					ReferenceType: "purchase",
					ReferenceID:   &purchase.ID,
					Notes:         &noteText,
				}
				if err := tx.Create(&movement).Error; err != nil {
					return err
				}
			}
		}

		purchase.Items = purchaseItems
		return nil
	})

	if err != nil {
		return nil, err
	}

	return s.purchaseRepo.GetByID(purchase.ID, storeID)
}

func (s *purchaseService) List(storeID uint, limit, offset int) ([]models.Purchase, int64, error) {
	return s.purchaseRepo.GetByStore(storeID, limit, offset)
}

func (s *purchaseService) GetByID(id uint, storeID uint) (*models.Purchase, error) {
	return s.purchaseRepo.GetByID(id, storeID)
}
