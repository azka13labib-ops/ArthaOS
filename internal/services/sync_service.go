package services

import (
	"gorm.io/gorm"
)

type SyncService interface {
	BatchSync(storeID uint, req BatchSyncRequest) (*BatchSyncResponse, error)
}

type syncService struct {
	db          *gorm.DB
	saleService SaleService
	expService  ExpenseService
}

func NewSyncService(db *gorm.DB, saleService SaleService, expService ExpenseService) SyncService {
	return &syncService{db, saleService, expService}
}

type BatchSyncRequest struct {
	Sales        []SaleRequest `json:"sales"`
	Transactions []SaleRequest `json:"transactions"`
	// We can add expenses, debt payments, etc. later
}

type BatchSyncResponse struct {
	SyncedSales int      `json:"synced_sales"`
	FailedSales int      `json:"failed_sales"`
	SyncedIDs   []string `json:"synced_ids"`
	FailedIDs   []string `json:"failed_ids"`
	Errors      []string `json:"errors,omitempty"`
}

func (s *syncService) BatchSync(storeID uint, req BatchSyncRequest) (*BatchSyncResponse, error) {
	// For offline first, we process all items. Even if some fail, we continue to sync the rest.
	var syncedSales, failedSales int
	var syncedIDs, failedIDs, syncErrors []string

	salesToProcess := req.Sales
	if len(salesToProcess) == 0 && len(req.Transactions) > 0 {
		salesToProcess = req.Transactions
	}

	for _, saleReq := range salesToProcess {
		corrID := saleReq.CorrelationID
		// Note: CreateSale already handles its own database transaction and idempotency check
		_, err := s.saleService.CreateSale(storeID, saleReq)
		if err != nil {
			failedSales++
			if corrID != "" {
				failedIDs = append(failedIDs, corrID)
			}
			syncErrors = append(syncErrors, err.Error())
		} else {
			syncedSales++
			if corrID != "" {
				syncedIDs = append(syncedIDs, corrID)
			}
		}
	}

	if syncedIDs == nil {
		syncedIDs = []string{}
	}
	if failedIDs == nil {
		failedIDs = []string{}
	}

	return &BatchSyncResponse{
		SyncedSales: syncedSales,
		FailedSales: failedSales,
		SyncedIDs:   syncedIDs,
		FailedIDs:   failedIDs,
		Errors:      syncErrors,
	}, nil
}
