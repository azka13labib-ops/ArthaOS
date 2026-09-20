package services

import (
	"errors"

	"app/internal/models"
	"app/internal/repository"

	"gorm.io/gorm"
)

type ExpenseService interface {
	CreateExpense(storeID uint, req ExpenseRequest) (*models.Transaction, error)
	GetExpenses(storeID uint, limit, offset int) ([]models.Transaction, error)
}

type expenseService struct {
	db      *gorm.DB
	trxRepo repository.TransactionRepository
}

func NewExpenseService(db *gorm.DB, trxRepo repository.TransactionRepository) ExpenseService {
	return &expenseService{db, trxRepo}
}

type ExpenseRequest struct {
	TotalAmount int64                `json:"total_amount"`
	Description string               `json:"description"`
	Payments    []SaleRequestPayment `json:"payments"`
}

func (s *expenseService) CreateExpense(storeID uint, req ExpenseRequest) (*models.Transaction, error) {
	if req.TotalAmount <= 0 {
		return nil, errors.New("expense total amount must be greater than zero")
	}

	var totalPaid int64
	var payments []models.TransactionPayment

	for _, p := range req.Payments {
		if p.Amount <= 0 {
			return nil, errors.New("payment amount must be greater than zero")
		}
		if p.PaymentMethod == "debt" {
			return nil, errors.New("cannot use debt to pay for expense directly in MVP")
		}
		if p.CustomerID != nil {
			return nil, errors.New("customer_id must be null for expense payments")
		}

		totalPaid += p.Amount
		payments = append(payments, models.TransactionPayment{
			Amount:        p.Amount,
			PaymentMethod: p.PaymentMethod,
		})
	}

	if totalPaid != req.TotalAmount {
		return nil, errors.New("sum of payments must equal total amount")
	}

	var desc *string
	if req.Description != "" {
		desc = &req.Description
	}

	trx := models.Transaction{
		StoreID:     storeID,
		Type:        "expense",
		TotalAmount: req.TotalAmount,
		Description: desc,
	}

	err := s.trxRepo.CreateTransaction(s.db, &trx, nil, payments, nil, nil)
	if err != nil {
		return nil, err
	}

	return &trx, nil
}

func (s *expenseService) GetExpenses(storeID uint, limit, offset int) ([]models.Transaction, error) {
	return s.trxRepo.GetByStore(storeID, limit, offset)
}
