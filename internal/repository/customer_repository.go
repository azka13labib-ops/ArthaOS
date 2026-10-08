package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type CustomerRepository interface {
	Create(customer *models.Customer) error
	GetByStore(storeID uint) ([]models.Customer, error)
}

type customerRepository struct {
	db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) CustomerRepository {
	return &customerRepository{db}
}

func (r *customerRepository) Create(customer *models.Customer) error {
	return r.db.Create(customer).Error
}

func (r *customerRepository) GetByStore(storeID uint) ([]models.Customer, error) {
	var customers []models.Customer
	err := r.db.Where("store_id = ?", storeID).Find(&customers).Error
	return customers, err
}
