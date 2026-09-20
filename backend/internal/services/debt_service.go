package services

import (
	"errors"
	"fmt"
	"time"

	"app/internal/models"
	"app/internal/repository"

	"gorm.io/gorm"
)

type DebtService interface {
	GetDebts(storeID uint) ([]models.Debt, error)
	PayDebt(storeID uint, debtID uint, amount int64, paymentMethod string, notes *string) (*models.DebtPayment, error)
}

type debtService struct {
	db       *gorm.DB
	debtRepo repository.DebtRepository
	trxRepo  repository.TransactionRepository
}

func NewDebtService(db *gorm.DB, debtRepo repository.DebtRepository, trxRepo repository.TransactionRepository) DebtService {
	return &debtService{db, debtRepo, trxRepo}
}

func (s *debtService) GetDebts(storeID uint) ([]models.Debt, error) {
	return s.debtRepo.GetByStore(storeID)
}

func (s *debtService) PayDebt(storeID uint, debtID uint, amount int64, paymentMethod string, notes *string) (*models.DebtPayment, error) {
	if amount <= 0 {
		return nil, errors.New("payment amount must be greater than zero")
	}

	var payment *models.DebtPayment

	err := s.db.Transaction(func(tx *gorm.DB) error {

		debt, err := s.debtRepo.GetByIDAndStoreWithLock(tx, debtID, storeID)
		if err != nil {
			return errors.New("debt not found")
		}

		if debt.RemainingAmount < amount {
			return errors.New("payment amount exceeds remaining debt")
		}

		debt.RemainingAmount -= amount
		if debt.RemainingAmount == 0 {
			debt.Status = "paid"
		} else {
			debt.Status = "partially_paid"
		}

		if err := s.debtRepo.Update(tx, debt); err != nil {
			return err
		}

		now := time.Now()
		payment = &models.DebtPayment{
			DebtID:        debtID,
			Amount:        amount,
			PaymentMethod: paymentMethod,
			PaidAt:        now,
			Notes:         notes,
		}
		if err := s.debtRepo.CreatePayment(tx, payment); err != nil {
			return err
		}

		desc := fmt.Sprintf("Payment for debt %d", debtID)
		if notes != nil {
			desc += " - " + *notes
		}

		trx := &models.Transaction{
			StoreID:     storeID,
			Type:        "debt_payment",
			TotalAmount: amount,
			Description: &desc,
		}

		trxPayment := models.TransactionPayment{
			Amount:        amount,
			PaymentMethod: paymentMethod,
		}

		if err := s.trxRepo.CreateTransaction(tx, trx, nil, []models.TransactionPayment{trxPayment}, nil, nil); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return payment, nil
}
