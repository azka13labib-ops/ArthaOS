package services

import (
	"app/internal/models"
	"app/internal/repository"
)

type CustomerService interface {
	CreateCustomer(storeID uint, name string, phone *string) (*models.Customer, error)
	GetCustomers(storeID uint) ([]models.Customer, error)
}

type customerService struct {
	repo repository.CustomerRepository
}

func NewCustomerService(repo repository.CustomerRepository) CustomerService {
	return &customerService{repo}
}

func (s *customerService) CreateCustomer(storeID uint, name string, phone *string) (*models.Customer, error) {
	customer := &models.Customer{
		StoreID:     storeID,
		Name:        name,
		PhoneNumber: phone,
	}
	err := s.repo.Create(customer)
	return customer, err
}

func (s *customerService) GetCustomers(storeID uint) ([]models.Customer, error) {
	return s.repo.GetByStore(storeID)
}
