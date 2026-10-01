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
	Sales    []SaleRequest `json:"sales"`
	// We can add expenses, debt payments, etc. later
}

type BatchSyncResponse struct {
	SyncedSales int `json:"synced_sales"`
	FailedSales int `json:"failed_sales"`
}

func (s *syncService) BatchSync(storeID uint, req BatchSyncRequest) (*BatchSyncResponse, error) {
	// For offline first, we process all items. Even if some fail, we continue to sync the rest.
	var syncedSales, failedSales int

	for _, saleReq := range req.Sales {
		// Note: CreateSale already handles its own database transaction
		_, err := s.saleService.CreateSale(storeID, saleReq)
		if err != nil {
			failedSales++
			// Ideally we'd log the error or return an array of errors
		} else {
			syncedSales++
		}
	}

	return &BatchSyncResponse{
		SyncedSales: syncedSales,
		FailedSales: failedSales,
	}, nil
}
