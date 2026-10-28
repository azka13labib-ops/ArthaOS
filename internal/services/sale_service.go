package services

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"app/internal/models"
	"app/internal/repository"
	"app/internal/worker"

	"gorm.io/gorm"
)

type SaleService interface {
	CreateSale(storeID uint, req SaleRequest) (*models.Transaction, error)
	GetSales(storeID uint, limit, offset int) ([]models.Transaction, error)
	VoidSale(storeID uint, transactionID uint, authorizedByID uint, reason string) (*models.Transaction, error)
}

type saleService struct {
	db          *gorm.DB
	productRepo repository.ProductRepository
	trxRepo     repository.TransactionRepository
	auditRepo   repository.AuditRepository
	pushService PushService
	workerPool  *worker.Pool
}

func NewSaleService(db *gorm.DB, productRepo repository.ProductRepository, trxRepo repository.TransactionRepository) SaleService {
	return &saleService{db: db, productRepo: productRepo, trxRepo: trxRepo}
}

func NewSaleServiceWithNotifier(
	db *gorm.DB,
	productRepo repository.ProductRepository,
	trxRepo repository.TransactionRepository,
	auditRepo repository.AuditRepository,
	pushService PushService,
	pool *worker.Pool,
) SaleService {
	return &saleService{
		db:          db,
		productRepo: productRepo,
		trxRepo:     trxRepo,
		auditRepo:   auditRepo,
		pushService: pushService,
		workerPool:  pool,
	}
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
	CorrelationID string               `json:"correlation_id"`
	OccurredAt    string               `json:"occurred_at"`
	Items         []SaleRequestItem    `json:"items"`
	Payments      []SaleRequestPayment `json:"payments"`
	Description   string               `json:"description"`
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
		// Idempotency check for offline sync and repeated requests
		if req.CorrelationID != "" {
			var existing models.Transaction
			if err := tx.Where("store_id = ? AND correlation_id = ?", storeID, req.CorrelationID).
				Preload("Items").Preload("Payments").First(&existing).Error; err == nil {
				finalTrx = &existing
				return nil
			}
		}

		var totalAmount int64
		var totalCost int64
		var transactionItems []models.TransactionItem
		var inventoryMovements []models.InventoryMovement

		for _, pid := range productIDs {
			qty := itemMap[pid]

			product, err := s.productRepo.GetByIDAndStoreWithLock(tx, pid, storeID)
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

			if product.IsRecipeBased {
				// Deduct raw materials instead of product stock
				if len(product.RecipeItems) == 0 {
					return errors.New("produk berbasis resep tidak memiliki komposisi bahan baku")
				}
				for _, recipe := range product.RecipeItems {
					reqQty := recipe.Quantity * qty
					res := tx.Exec(`
						UPDATE raw_materials 
						SET current_stock = current_stock - $1, updated_at = NOW() 
						WHERE id = $2 AND store_id = $3 AND current_stock >= $1
					`, reqQty, recipe.RawMaterialID, storeID)
					if res.Error != nil {
						return res.Error
					}
					if res.RowsAffected == 0 {
						return errors.New("stok bahan baku tidak mencukupi untuk memenuhi pesanan resep")
					}

					rmID := recipe.RawMaterialID
					inventoryMovements = append(inventoryMovements, models.InventoryMovement{
						StoreID:       storeID,
						RawMaterialID: &rmID,
						MovementType:  "sale",
						QuantityDelta: -reqQty,
						ReferenceType: "sale",
					})
				}
			} else {
				// Deduct normal product stock with verified RowsAffected
				res := tx.Exec(`
					UPDATE products
					SET current_stock = current_stock - $1, updated_at = NOW()
					WHERE id = $2 AND store_id = $3 AND current_stock >= $1 AND is_active = true
				`, qty, pid, storeID)
				if res.Error != nil {
					return res.Error
				}
				if res.RowsAffected == 0 {
					return errors.New("insufficient stock or product not found")
				}

				pidCopy := pid
				inventoryMovements = append(inventoryMovements, models.InventoryMovement{
					StoreID:       storeID,
					ProductID:     &pidCopy,
					MovementType:  "sale",
					QuantityDelta: -qty,
					ReferenceType: "sale",
				})
			}
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

		var corrID *string
		if req.CorrelationID != "" {
			corrID = &req.CorrelationID
		}

		occurredAt := time.Now()
		if req.OccurredAt != "" {
			if t, err := time.Parse(time.RFC3339, req.OccurredAt); err == nil {
				occurredAt = t
			} else if t, err := time.Parse("2006-01-02T15:04:05.000Z", req.OccurredAt); err == nil {
				occurredAt = t
			}
		}

		trx := models.Transaction{
			StoreID:       storeID,
			Type:          "sale",
			TotalAmount:   totalAmount,
			TotalCost:     totalCost,
			Description:   desc,
			CorrelationID: corrID,
			OccurredAt:    occurredAt,
		}

		if err := s.trxRepo.CreateTransaction(tx, &trx, transactionItems, payments, inventoryMovements, debt); err != nil {
			return err
		}

		finalTrx = &trx
		return nil
	})

	if err != nil {
		// A concurrent retry can pass the initial lookup before the first
		// transaction commits. The database unique index rejects the duplicate;
		// return the sale that won the race instead of treating the retry as failed.
		if req.CorrelationID != "" {
			var existing models.Transaction
			if lookupErr := s.db.Where("store_id = ? AND correlation_id = ?", storeID, req.CorrelationID).
				Preload("Items").Preload("Payments").First(&existing).Error; lookupErr == nil {
				return &existing, nil
			}
		}
		return nil, err
	}

	return finalTrx, nil
}

func (s *saleService) GetSales(storeID uint, limit, offset int) ([]models.Transaction, error) {
	return s.trxRepo.GetByStore(storeID, limit, offset)
}

func (s *saleService) VoidSale(storeID uint, transactionID uint, authorizedByID uint, reason string) (*models.Transaction, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return nil, errors.New("alasan void wajib diisi")
	}

	var trx models.Transaction
	if err := s.db.Preload("Items").Preload("Payments").
		Where("id = ? AND store_id = ?", transactionID, storeID).
		First(&trx).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("transaksi tidak ditemukan")
		}
		return nil, err
	}

	if trx.Status == "voided" {
		return nil, errors.New("transaksi sudah pernah di-void")
	}
	if trx.Type != "sale" {
		return nil, errors.New("hanya transaksi penjualan (sale) yang dapat di-void")
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Reverse stock and raw materials for each transaction item
		for _, item := range trx.Items {
			product, err := s.productRepo.GetByIDAndStoreWithLock(tx, item.ProductID, storeID)
			if err != nil {
				return fmt.Errorf("gagal memuat data produk ID %d: %w", item.ProductID, err)
			}

			if product.IsRecipeBased {
				// Revert raw materials
				var recipes []models.RecipeItem
				if err := tx.Where("product_id = ?", item.ProductID).Find(&recipes).Error; err != nil {
					return err
				}
				for _, r := range recipes {
					restockQty := r.Quantity * item.Quantity
					res := tx.Exec(`
						UPDATE raw_materials 
						SET current_stock = current_stock + $1, updated_at = NOW() 
						WHERE id = $2 AND store_id = $3
					`, restockQty, r.RawMaterialID, storeID)
					if res.Error != nil {
						return res.Error
					}

					rmID := r.RawMaterialID
					notes := fmt.Sprintf("Void sale #%d: pengembalian resep %s", trx.ID, product.Name)
					movement := models.InventoryMovement{
						StoreID:       storeID,
						RawMaterialID: &rmID,
						MovementType:  "adjustment",
						QuantityDelta: restockQty,
						ReferenceType: "transaction",
						ReferenceID:   &trx.ID,
						Notes:         &notes,
					}
					if err := tx.Create(&movement).Error; err != nil {
						return err
					}
				}
			} else {
				// Revert standard product stock
				res := tx.Exec(`
					UPDATE products 
					SET current_stock = current_stock + $1, updated_at = NOW() 
					WHERE id = $2 AND store_id = $3
				`, item.Quantity, item.ProductID, storeID)
				if res.Error != nil {
					return res.Error
				}

				pid := item.ProductID
				notes := fmt.Sprintf("Void sale #%d: pengembalian produk %s", trx.ID, product.Name)
				movement := models.InventoryMovement{
					StoreID:       storeID,
					ProductID:     &pid,
					MovementType:  "adjustment",
					QuantityDelta: item.Quantity,
					ReferenceType: "transaction",
					ReferenceID:   &trx.ID,
					Notes:         &notes,
				}
				if err := tx.Create(&movement).Error; err != nil {
					return err
				}
			}
		}

		// 2. Reverse / cancel associated debt if paid via debt
		var debt models.Debt
		if err := tx.Where("store_id = ? AND transaction_id = ?", storeID, trx.ID).First(&debt).Error; err == nil {
			if err := tx.Model(&debt).Updates(map[string]interface{}{
				"remaining_amount": 0,
				"status":           "paid",
			}).Error; err != nil {
				return fmt.Errorf("gagal membatalkan catatan kasbon: %w", err)
			}
		}

		// 3. Insert transaction void authorization log
		tv := models.TransactionVoid{
			StoreID:        storeID,
			TransactionID:  trx.ID,
			AuthorizedByID: authorizedByID,
			Reason:         reason,
		}
		if err := tx.Create(&tv).Error; err != nil {
			return fmt.Errorf("gagal menyimpan otorisasi void: %w", err)
		}

		// 4. Mark transaction as voided
		if err := tx.Model(&models.Transaction{}).
			Where("id = ? AND store_id = ?", trx.ID, storeID).
			Update("status", "voided").Error; err != nil {
			return fmt.Errorf("gagal mengupdate status transaksi: %w", err)
		}
		trx.Status = "voided"

		return nil
	})

	if err != nil {
		return nil, err
	}

	// 5. Audit log
	if s.auditRepo != nil {
		go func() {
			meta := fmt.Sprintf(`{"actor_id":%d,"reason":%q,"total_amount":%d}`, authorizedByID, reason, trx.TotalAmount)
			_ = s.auditRepo.Log(s.db, storeID, "user", "void_sale", "transaction", trx.ID, &meta)
		}()
	}

	// 6. Asynchronous Web Push notification
	if s.pushService != nil {
		pushJob := func(ctx context.Context) error {
			return s.pushService.BroadcastToStore(ctx, storeID, PushPayload{
				Title: "Notifikasi Void Transaksi",
				Body:  fmt.Sprintf("Penjualan #%d senilai Rp%d telah dibatalkan (void). Alasan: %s", trx.ID, trx.TotalAmount, reason),
				URL:   "/reports",
				Tag:   fmt.Sprintf("void-%d", trx.ID),
			})
		}
		if s.workerPool != nil {
			if !s.workerPool.Submit(pushJob) {
				go func() { _ = pushJob(context.Background()) }()
			}
		} else {
			go func() { _ = pushJob(context.Background()) }()
		}
	}

	return &trx, nil
}
