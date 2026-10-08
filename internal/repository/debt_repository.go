package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type DebtRepository interface {
	Create(tx *gorm.DB, debt *models.Debt) error
	GetByStore(storeID uint) ([]models.Debt, error)
	GetByIDAndStore(id uint, storeID uint) (*models.Debt, error)
	GetByIDAndStoreWithLock(tx *gorm.DB, id uint, storeID uint) (*models.Debt, error)
	Update(tx *gorm.DB, debt *models.Debt) error
	CreatePayment(tx *gorm.DB, payment *models.DebtPayment) error
}

type debtRepository struct {
	db *gorm.DB
}

func NewDebtRepository(db *gorm.DB) DebtRepository {
	return &debtRepository{db}
}

func (r *debtRepository) Create(tx *gorm.DB, debt *models.Debt) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.Create(debt).Error
}

func (r *debtRepository) GetByStore(storeID uint) ([]models.Debt, error) {
	var debts []models.Debt
	err := r.db.Preload("Customer").Preload("Payments").Where("store_id = ? AND remaining_amount > 0", storeID).Find(&debts).Error
	return debts, err
}

func (r *debtRepository) GetByIDAndStore(id uint, storeID uint) (*models.Debt, error) {
	var debt models.Debt
	err := r.db.Preload("Customer").Preload("Payments").Where("id = ? AND store_id = ?", id, storeID).First(&debt).Error
	return &debt, err
}

func (r *debtRepository) GetByIDAndStoreWithLock(tx *gorm.DB, id uint, storeID uint) (*models.Debt, error) {
	db := r.db
	if tx != nil {
		db = tx
	}
	var debt models.Debt
	err := db.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ? AND store_id = ?", id, storeID).First(&debt).Error
	return &debt, err
}

func (r *debtRepository) Update(tx *gorm.DB, debt *models.Debt) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.Save(debt).Error
}

func (r *debtRepository) CreatePayment(tx *gorm.DB, payment *models.DebtPayment) error {
	db := r.db
	if tx != nil {
		db = tx
	}
	return db.Create(payment).Error
}
