package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type TransactionRepository interface {
	CreateTransaction(tx *gorm.DB, trx *models.Transaction, items []models.TransactionItem, payments []models.TransactionPayment, movements []models.InventoryMovement, debt *models.Debt) error
	GetByIDAndStore(id uint, storeID uint) (*models.Transaction, error)
	GetByStore(storeID uint, limit int, offset int) ([]models.Transaction, error)
}

type transactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(db *gorm.DB) TransactionRepository {
	return &transactionRepository{db}
}

func (r *transactionRepository) CreateTransaction(tx *gorm.DB, trx *models.Transaction, items []models.TransactionItem, payments []models.TransactionPayment, movements []models.InventoryMovement, debt *models.Debt) error {
	db := r.db
	if tx != nil {
		db = tx
	}

	if err := db.Create(trx).Error; err != nil {
		return err
	}

	if len(items) > 0 {
		for i := range items {
			items[i].TransactionID = trx.ID
		}
		if err := db.Create(&items).Error; err != nil {
			return err
		}
	}

	if len(payments) > 0 {
		for i := range payments {
			payments[i].TransactionID = trx.ID
		}
		if err := db.Create(&payments).Error; err != nil {
			return err
		}
	}

	if len(movements) > 0 {
		for i := range movements {
			movements[i].ReferenceID = &trx.ID
		}
		if err := db.Create(&movements).Error; err != nil {
			return err
		}
	}

	if debt != nil {
		debt.TransactionID = &trx.ID
		if err := db.Create(debt).Error; err != nil {
			return err
		}
	}

	return nil
}

func (r *transactionRepository) GetByIDAndStore(id uint, storeID uint) (*models.Transaction, error) {
	var trx models.Transaction
	err := r.db.Preload("Items").Preload("Payments").Where("id = ? AND store_id = ?", id, storeID).First(&trx).Error
	return &trx, err
}

func (r *transactionRepository) GetByStore(storeID uint, limit int, offset int) ([]models.Transaction, error) {
	var trxs []models.Transaction
	q := r.db.Preload("Items").Preload("Payments").Where("store_id = ?", storeID).Order("occurred_at DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	err := q.Find(&trxs).Error
	return trxs, err
}
