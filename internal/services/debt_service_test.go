package services_test

import (
	"testing"
	"time"

	"app/internal/models"
	"app/internal/repository"
	"app/internal/services"
)

func TestDebtService_PayDebt_Validation(t *testing.T) {
	service := services.NewDebtService(nil, nil, nil)

	_, err := service.PayDebt(1, 1, 0, "cash", nil)
	if err == nil || err.Error() != "payment amount must be greater than zero" {
		t.Fatalf("expected 'payment amount must be greater than zero', got: %v", err)
	}

	_, errNegative := service.PayDebt(1, 1, -5000, "cash", nil)
	if errNegative == nil || errNegative.Error() != "payment amount must be greater than zero" {
		t.Fatalf("expected 'payment amount must be greater than zero', got: %v", errNegative)
	}
}

func TestDebtService_PayDebt_Integration(t *testing.T) {
	db := getTestDB(t)

	tx := db.Begin()
	defer tx.Rollback()

	testStoreID := uint(999101)

	// Create test store & customer
	store := models.Store{ID: testStoreID, Name: "Toko Kasbon Test"}
	if err := tx.Create(&store).Error; err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	cust := models.Customer{StoreID: testStoreID, Name: "Pelanggan Kasbon"}
	if err := tx.Create(&cust).Error; err != nil {
		t.Fatalf("failed to create customer: %v", err)
	}

	// Buat transaksi asal kasbon
	trx := models.Transaction{
		StoreID:     testStoreID,
		Type:        "sale",
		TotalAmount: 100000,
		Status:      "completed",
		OccurredAt:  time.Now(),
	}
	if err := tx.Create(&trx).Error; err != nil {
		t.Fatalf("failed to create transaction: %v", err)
	}

	// Buat data kasbon Rp 100.000
	debt := models.Debt{
		StoreID:         testStoreID,
		CustomerID:      cust.ID,
		TransactionID:   &trx.ID,
		Source:          "pos_kasbon",
		OriginalAmount:  100000,
		RemainingAmount: 100000,
		Status:          "unpaid",
	}
	if err := tx.Create(&debt).Error; err != nil {
		t.Fatalf("failed to create debt: %v", err)
	}

	debtRepo := repository.NewDebtRepository(tx)
	trxRepo := repository.NewTransactionRepository(tx)
	debtService := services.NewDebtService(tx, debtRepo, trxRepo)

	// Test 1: Pembayaran melebihi sisa hutang harus ditolak
	_, errOverpay := debtService.PayDebt(testStoreID, debt.ID, 150000, "cash", nil)
	if errOverpay == nil || errOverpay.Error() != "payment amount exceeds remaining debt" {
		t.Fatalf("expected error overpayment, got: %v", errOverpay)
	}

	// Test 2: Pembayaran sebagian (Rp 40.000)
	note := "Cicilan 1"
	payment1, errPart := debtService.PayDebt(testStoreID, debt.ID, 40000, "cash", &note)
	if errPart != nil {
		t.Fatalf("partial payment failed: %v", errPart)
	}
	if payment1.Amount != 40000 {
		t.Errorf("expected payment amount 40000, got %d", payment1.Amount)
	}

	var updatedDebt models.Debt
	if err := tx.First(&updatedDebt, debt.ID).Error; err != nil {
		t.Fatalf("failed to find updated debt: %v", err)
	}
	if updatedDebt.RemainingAmount != 60000 {
		t.Errorf("expected remaining 60000, got %d", updatedDebt.RemainingAmount)
	}
	if updatedDebt.Status != "partially_paid" {
		t.Errorf("expected status 'partially_paid', got '%s'", updatedDebt.Status)
	}

	// Test 3: Pelunasan sisa (Rp 60.000)
	_, errFull := debtService.PayDebt(testStoreID, debt.ID, 60000, "transfer", nil)
	if errFull != nil {
		t.Fatalf("full payment failed: %v", errFull)
	}

	if err := tx.First(&updatedDebt, debt.ID).Error; err != nil {
		t.Fatalf("failed to find updated debt: %v", err)
	}
	if updatedDebt.RemainingAmount != 0 {
		t.Errorf("expected remaining 0, got %d", updatedDebt.RemainingAmount)
	}
	if updatedDebt.Status != "paid" {
		t.Errorf("expected status 'paid', got '%s'", updatedDebt.Status)
	}
}
