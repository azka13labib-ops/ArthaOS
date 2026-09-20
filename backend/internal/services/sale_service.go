package services

import (
	"errors"
	"sort"
	"time"

	"app/internal/models"
	"app/internal/repository"

	"gorm.io/gorm"
)

type SaleService interface {
	CreateSale(storeID uint, req SaleRequest) (*models.Transaction, error)
	GetSales(storeID uint, limit, offset int) ([]models.Transaction, error)
}

type saleService struct {
	db          *gorm.DB
	productRepo repository.ProductRepository
	trxRepo     repository.TransactionRepository
}

func NewSaleService(db *gorm.DB, productRepo repository.ProductRepository, trxRepo repository.TransactionRepository) SaleService {
	return &saleService{db, productRepo, trxRepo}
}

type SaleRequestItem struct {
	ProductID uint `json:"product_id"`
	Quantity  int  `json:"quantity"`
}

type SaleRequestPayment struct {
	Amount        int64   `json:"amount"`
	PaymentMethod string  `json:"payment_method"`
	CustomerID    *uint   `json:"customer_id"`
	DueDate       *string `json:"due_date"`
}

type SaleRequest struct {
	Items       []SaleRequestItem    `json:"items"`
	Payments    []SaleRequestPayment `json:"payments"`
	Description string               `json:"description"`
}

func (s *saleService) CreateSale(storeID uint, req SaleRequest) (*models.Transaction, error) {
	if len(req.Items) == 0 {
		return nil, errors.New("cannot create sale without items")
	}

	itemMap := make(map[uint]int)
	for _, it := range req.Items {
		if it.Quantity <= 0 {
			return nil, errors.New("item quantity must be greater than zero")
		}
		itemMap[it.ProductID] += it.Quantity
	}

	var productIDs []uint
	for pid := range itemMap {
		productIDs = append(productIDs, pid)
	}
	sort.Slice(productIDs, func(i, j int) bool { return productIDs[i] < productIDs[j] })

	var finalTrx *models.Transaction

	err := s.db.Transaction(func(tx *gorm.DB) error {
		var totalAmount int64
		var totalCost int64
		var transactionItems []models.TransactionItem
		var inventoryMovements []models.InventoryMovement

		for _, pid := range productIDs {
			qty := itemMap[pid]

			product, err := s.productRepo.UpdateStockWithLock(tx, pid, storeID, qty)
			if err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return errors.New("insufficient stock or product not found")
				}
				return err
			}

			subtotal := product.SellPrice * int64(qty)
			totalAmount += subtotal
			totalCost += product.BuyPrice * int64(qty)

			transactionItems = append(transactionItems, models.TransactionItem{
				ProductID: pid,
				Quantity:  qty,
				SellPrice: product.SellPrice,
				CostPrice: product.BuyPrice,
				Subtotal:  subtotal,
			})

			inventoryMovements = append(inventoryMovements, models.InventoryMovement{
				StoreID:       storeID,
				ProductID:     pid,
				MovementType:  "sale",
				QuantityDelta: -qty,
				ReferenceType: "sale",
			})
		}

		var totalPaid int64
		var debtAmount int64
		var debt *models.Debt
		var payments []models.TransactionPayment

		for _, p := range req.Payments {
			if p.Amount <= 0 {
				return errors.New("payment amount must be greater than zero")
			}

			if p.PaymentMethod == "debt" {
				if p.CustomerID == nil {
					return errors.New("customer_id must not be null when payment_method is debt")
				}
				debtAmount += p.Amount

				var dueDate *time.Time
				if p.DueDate != nil {
					parsed, err := time.Parse("2006-01-02", *p.DueDate)
					if err == nil {
						dueDate = &parsed
					}
				}

				debt = &models.Debt{
					StoreID:         storeID,
					CustomerID:      *p.CustomerID,
					Source:          "sale",
					OriginalAmount:  p.Amount,
					RemainingAmount: p.Amount,
					Status:          "unpaid",
					DueDate:         dueDate,
				}
			} else {
				if p.CustomerID != nil {
					return errors.New("customer_id must be null when payment_method is not debt")
				}
			}

			totalPaid += p.Amount
			payments = append(payments, models.TransactionPayment{
				Amount:        p.Amount,
				PaymentMethod: p.PaymentMethod,
				CustomerID:    p.CustomerID,
			})
		}

		if totalPaid != totalAmount {
			return errors.New("sum of payments must equal total amount")
		}

		var desc *string
		if req.Description != "" {
			desc = &req.Description
		}

		trx := models.Transaction{
			StoreID:     storeID,
			Type:        "sale",
			TotalAmount: totalAmount,
			TotalCost:   totalCost,
			Description: desc,
		}

		if err := s.trxRepo.CreateTransaction(tx, &trx, transactionItems, payments, inventoryMovements, debt); err != nil {
			return err
		}

		finalTrx = &trx
		return nil
	})

	if err != nil {
		return nil, err
	}

	return finalTrx, nil
}

func (s *saleService) GetSales(storeID uint, limit, offset int) ([]models.Transaction, error) {
	return s.trxRepo.GetByStore(storeID, limit, offset)
}
