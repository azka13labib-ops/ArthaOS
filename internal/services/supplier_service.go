package services

import (
	"errors"
	"strings"

	"app/internal/models"
	"app/internal/repository"
)

type SupplierService interface {
	Create(storeID uint, name, phone, email, address, notes string) (*models.Supplier, error)
	List(storeID uint) ([]models.Supplier, error)
	GetByID(id uint, storeID uint) (*models.Supplier, error)
	Update(id uint, storeID uint, name, phone, email, address, notes string) (*models.Supplier, error)
	Delete(id uint, storeID uint) error
}

type supplierService struct {
	supplierRepo repository.SupplierRepository
}

func NewSupplierService(supplierRepo repository.SupplierRepository) SupplierService {
	return &supplierService{supplierRepo: supplierRepo}
}

func (s *supplierService) Create(storeID uint, name, phone, email, address, notes string) (*models.Supplier, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("nama pemasok wajib diisi")
	}

	supplier := &models.Supplier{
		StoreID: storeID,
		Name:    name,
		Phone:   strings.TrimSpace(phone),
		Email:   strings.TrimSpace(email),
		Address: strings.TrimSpace(address),
		Notes:   strings.TrimSpace(notes),
	}

	if err := s.supplierRepo.Create(supplier); err != nil {
		return nil, err
	}
	return supplier, nil
}

func (s *supplierService) List(storeID uint) ([]models.Supplier, error) {
	return s.supplierRepo.GetByStore(storeID)
}

func (s *supplierService) GetByID(id uint, storeID uint) (*models.Supplier, error) {
	return s.supplierRepo.GetByID(id, storeID)
}

func (s *supplierService) Update(id uint, storeID uint, name, phone, email, address, notes string) (*models.Supplier, error) {
	supplier, err := s.supplierRepo.GetByID(id, storeID)
	if err != nil {
		return nil, err
	}

	name = strings.TrimSpace(name)
	if name == "" {
		return nil, errors.New("nama pemasok tidak boleh kosong")
	}

	supplier.Name = name
	supplier.Phone = strings.TrimSpace(phone)
	supplier.Email = strings.TrimSpace(email)
	supplier.Address = strings.TrimSpace(address)
	supplier.Notes = strings.TrimSpace(notes)

	if err := s.supplierRepo.Update(supplier); err != nil {
		return nil, err
	}
	return supplier, nil
}

func (s *supplierService) Delete(id uint, storeID uint) error {
	return s.supplierRepo.Delete(id, storeID)
}
