package services_test

import (
	"os"
	"testing"
	"time"

	"app/internal/models"
	"app/internal/repository"
	"app/internal/services"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func getTestDB(t *testing.T) *gorm.DB {
	_ = godotenv.Load("../../.env")
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		t.Skip("DB_URL not configured, skipping database integration tests")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Skipf("cannot connect to database: %v", err)
	}

	_ = db.AutoMigrate(
		&models.Store{},
		&models.Product{},
		&models.Transaction{},
		&models.TransactionItem{},
		&models.TransactionPayment{},
		&models.Purchase{},
		&models.PurchaseItem{},
		&models.SupplierPayment{},
	)

	return db
}

func TestReportService_ProfitLoss_CalculationFixture(t *testing.T) {
	db := getTestDB(t)

	// Run within a transaction and roll back so nothing persists
	tx := db.Begin()
	defer tx.Rollback()

	testStoreID := uint(888801)
	todayStr := time.Now().Format("2006-01-02")

	// Create test store
	store := models.Store{
		ID:   testStoreID,
		Name: "Test Store P&L",
	}
	if err := tx.Create(&store).Error; err != nil {
		t.Fatalf("failed to create test store: %v", err)
	}

	// Fixture data:
	// Sale 1: Total 100,000, 2 items @ cost 30,000 each = COGS 60,000
	// Sale 2: Total 50,000, 1 item @ cost 20,000 = COGS 20,000
	// Sale 3 (Voided): Total 30,000, cost 15,000 (MUST BE IGNORED)
	// Expense 1: Total 25,000 (active)
	// Expense 2 (Voided): Total 10,000 (MUST BE IGNORED)
	//
	// Expected Manual Calculation:
	// Gross Sales = 100,000 + 50,000 = 150,000
	// COGS = 60,000 + 20,000 = 80,000
	// Gross Profit = 150,000 - 80,000 = 70,000
	// Expenses = 25,000
	// Net Profit = 70,000 - 25,000 = 45,000

	trx1 := models.Transaction{
		StoreID:     testStoreID,
		Type:        "sale",
		Status:      "completed",
		TotalAmount: 100000,
		OccurredAt:  time.Now(),
	}
	tx.Create(&trx1)
	tx.Create(&models.TransactionItem{
		TransactionID: trx1.ID,
		ProductID:     1,
		Quantity:      2,
		CostPrice:     30000,
		SellPrice:     50000,
		Subtotal:      100000,
	})

	trx2 := models.Transaction{
		StoreID:     testStoreID,
		Type:        "sale",
		Status:      "completed",
		TotalAmount: 50000,
		OccurredAt:  time.Now(),
	}
	tx.Create(&trx2)
	tx.Create(&models.TransactionItem{
		TransactionID: trx2.ID,
		ProductID:     1,
		Quantity:      1,
		CostPrice:     20000,
		SellPrice:     50000,
		Subtotal:      50000,
	})

	// Voided sale - should NOT be counted
	trxVoid := models.Transaction{
		StoreID:     testStoreID,
		Type:        "sale",
		Status:      "voided",
		TotalAmount: 30000,
		OccurredAt:  time.Now(),
	}
	tx.Create(&trxVoid)
	tx.Create(&models.TransactionItem{
		TransactionID: trxVoid.ID,
		ProductID:     1,
		Quantity:      1,
		CostPrice:     15000,
		SellPrice:     30000,
		Subtotal:      30000,
	})

	// Active Expense
	tx.Create(&models.Transaction{
		StoreID:     testStoreID,
		Type:        "expense",
		Status:      "completed",
		TotalAmount: 25000,
		OccurredAt:  time.Now(),
	})

	// Voided Expense
	tx.Create(&models.Transaction{
		StoreID:     testStoreID,
		Type:        "expense",
		Status:      "voided",
		TotalAmount: 10000,
		OccurredAt:  time.Now(),
	})

	svc := services.NewReportService(tx)
	report, err := svc.GetProfitLoss(testStoreID, todayStr, todayStr)
	if err != nil {
		t.Fatalf("GetProfitLoss failed: %v", err)
	}

	if report.GrossSales != 150000 {
		t.Errorf("GrossSales mismatch: expected 150000, got %d", report.GrossSales)
	}
	if report.COGS != 80000 {
		t.Errorf("COGS mismatch: expected 80000, got %d", report.COGS)
	}
	if report.GrossProfit != 70000 {
		t.Errorf("GrossProfit mismatch: expected 70000, got %d", report.GrossProfit)
	}
	if report.Expenses != 25000 {
		t.Errorf("Expenses mismatch: expected 25000, got %d", report.Expenses)
	}
	if report.NetProfit != 45000 {
		t.Errorf("NetProfit mismatch: expected 45000, got %d", report.NetProfit)
	}

	// Backwards compatibility alias checks
	if report.TotalSales != 150000 {
		t.Errorf("TotalSales alias mismatch: expected 150000, got %d", report.TotalSales)
	}
	if report.TotalCost != 80000 {
		t.Errorf("TotalCost alias mismatch: expected 80000, got %d", report.TotalCost)
	}
	if report.TotalExpenses != 25000 {
		t.Errorf("TotalExpenses alias mismatch: expected 25000, got %d", report.TotalExpenses)
	}
}

func TestReportService_StockValuation_CalculationFixture(t *testing.T) {
	db := getTestDB(t)

	tx := db.Begin()
	defer tx.Rollback()

	testStoreID := uint(888802)

	store := models.Store{
		ID:   testStoreID,
		Name: "Test Store Stock",
	}
	if err := tx.Create(&store).Error; err != nil {
		t.Fatalf("failed to create test store: %v", err)
	}

	// Product 1: stock 10, buy 5000, sell 8000 -> cost 50,000, retail 80,000
	// Product 2: stock 5,  buy 10000, sell 15000 -> cost 50,000, retail 75,000
	// Product 3 (inactive): stock 20, buy 1000, sell 2000 (MUST BE IGNORED)
	//
	// Expected:
	// Total Items = 10 + 5 = 15
	// Total Asset Cost = 50,000 + 50,000 = 100,000
	// Total Asset Retail = 80,000 + 75,000 = 155,000
	// Potential Gross Profit = 155,000 - 100,000 = 55,000

	p1 := models.Product{
		StoreID:      testStoreID,
		Name:         "Item A",
		SKU:          "SKU-A-888802",
		CurrentStock: 10,
		BuyPrice:     5000,
		SellPrice:    8000,
		IsActive:     true,
	}
	p2 := models.Product{
		StoreID:      testStoreID,
		Name:         "Item B",
		SKU:          "SKU-B-888802",
		CurrentStock: 5,
		BuyPrice:     10000,
		SellPrice:    15000,
		IsActive:     true,
	}
	pInactive := models.Product{
		StoreID:      testStoreID,
		Name:         "Item Inactive",
		SKU:          "SKU-C-888802",
		CurrentStock: 20,
		BuyPrice:     1000,
		SellPrice:    2000,
		IsActive:     false,
	}

	tx.Create(&p1)
	tx.Create(&p2)
	tx.Create(&pInactive)
	tx.Model(&pInactive).Update("is_active", false)

	svc := services.NewReportService(tx)
	valuation, err := svc.GetStockValuation(testStoreID)
	if err != nil {
		t.Fatalf("GetStockValuation failed: %v", err)
	}

	if valuation.TotalInventoryItems != 15 {
		t.Errorf("TotalInventoryItems mismatch: expected 15, got %d", valuation.TotalInventoryItems)
	}
	if valuation.TotalAssetCost != 100000 {
		t.Errorf("TotalAssetCost mismatch: expected 100000, got %d", valuation.TotalAssetCost)
	}
	if valuation.TotalAssetRetail != 155000 {
		t.Errorf("TotalAssetRetail mismatch: expected 155000, got %d", valuation.TotalAssetRetail)
	}
	if valuation.PotentialGrossProfit != 55000 {
		t.Errorf("PotentialGrossProfit mismatch: expected 55000, got %d", valuation.PotentialGrossProfit)
	}

	// Backwards compatibility alias checks
	if valuation.TotalItems != 15 {
		t.Errorf("TotalItems alias mismatch: expected 15, got %d", valuation.TotalItems)
	}
	if valuation.TotalValue != 100000 {
		t.Errorf("TotalValue alias mismatch: expected 100000, got %d", valuation.TotalValue)
	}
}

func TestReportService_CashFlow_CalculationFixture(t *testing.T) {
	db := getTestDB(t)

	tx := db.Begin()
	defer tx.Rollback()

	testStoreID := uint(888803)
	todayStr := time.Now().Format("2006-01-02")

	store := models.Store{
		ID:   testStoreID,
		Name: "Test Store CashFlow",
	}
	if err := tx.Create(&store).Error; err != nil {
		t.Fatalf("failed to create test store: %v", err)
	}

	// 1. Sale with cash payment 100,000
	trx1 := models.Transaction{
		StoreID:     testStoreID,
		Type:        "sale",
		Status:      "completed",
		TotalAmount: 100000,
		OccurredAt:  time.Now(),
	}
	tx.Create(&trx1)
	tx.Create(&models.TransactionPayment{
		TransactionID: trx1.ID,
		PaymentMethod: "cash",
		Amount:        100000,
	})

	// 2. Sale with debt payment 50,000 (receivable, not cash)
	trx2 := models.Transaction{
		StoreID:     testStoreID,
		Type:        "sale",
		Status:      "completed",
		TotalAmount: 50000,
		OccurredAt:  time.Now(),
	}
	tx.Create(&trx2)
	tx.Create(&models.TransactionPayment{
		TransactionID: trx2.ID,
		PaymentMethod: "debt",
		Amount:        50000,
	})

	// 3. Debt payment transaction (paying earlier debt) with transfer 30,000
	trx3 := models.Transaction{
		StoreID:     testStoreID,
		Type:        "debt_payment",
		Status:      "completed",
		TotalAmount: 30000,
		OccurredAt:  time.Now(),
	}
	tx.Create(&trx3)
	tx.Create(&models.TransactionPayment{
		TransactionID: trx3.ID,
		PaymentMethod: "transfer",
		Amount:        30000,
	})

	// 4. Expense transaction with cash payment 20,000
	trxExp := models.Transaction{
		StoreID:     testStoreID,
		Type:        "expense",
		Status:      "completed",
		TotalAmount: 20000,
		OccurredAt:  time.Now(),
	}
	tx.Create(&trxExp)
	tx.Create(&models.TransactionPayment{
		TransactionID: trxExp.ID,
		PaymentMethod: "cash",
		Amount:        20000,
	})

	// 5. Voided Expense transaction (must be ignored)
	trxExpVoid := models.Transaction{
		StoreID:     testStoreID,
		Type:        "expense",
		Status:      "voided",
		TotalAmount: 10000,
		OccurredAt:  time.Now(),
	}
	tx.Create(&trxExpVoid)
	tx.Create(&models.TransactionPayment{
		TransactionID: trxExpVoid.ID,
		PaymentMethod: "cash",
		Amount:        10000,
	})

	svc := services.NewReportService(tx)
	cf, err := svc.GetCashFlow(testStoreID, todayStr, todayStr)
	if err != nil {
		t.Fatalf("GetCashFlow failed: %v", err)
	}

	// Cash in: 100,000 (cash sale) + 30,000 (debt payment transfer) = 130,000
	if cf.CashIn != 130000 {
		t.Errorf("CashIn mismatch: expected 130000, got %d", cf.CashIn)
	}
	// Cash out: 20,000 (expense)
	if cf.CashOut != 20000 {
		t.Errorf("CashOut mismatch: expected 20000, got %d", cf.CashOut)
	}
	// Net: 130,000 - 20,000 = 110,000
	if cf.NetCashFlow != 110000 {
		t.Errorf("NetCashFlow mismatch: expected 110000, got %d", cf.NetCashFlow)
	}

	// Payment methods check
	var cashFound, transferFound bool
	for _, m := range cf.PaymentMethods {
		if m.Method == "cash" && m.Amount == 100000 {
			cashFound = true
		}
		if m.Method == "transfer" && m.Amount == 30000 {
			transferFound = true
		}
	}
	if !cashFound {
		t.Errorf("Expected cash method breakdown with amount 100000 not found: %+v", cf.PaymentMethods)
	}
	if !transferFound {
		t.Errorf("Expected transfer method breakdown with amount 30000 not found: %+v", cf.PaymentMethods)
	}
}

func TestReportService_CashFlow_WithStockPurchases_Fixture(t *testing.T) {
	db := getTestDB(t)

	tx := db.Begin()
	defer tx.Rollback()

	testStoreID := uint(888804)
	todayStr := time.Now().Format("2006-01-02")

	store := models.Store{
		ID:   testStoreID,
		Name: "Test Store FASE 2",
	}
	if err := tx.Create(&store).Error; err != nil {
		t.Fatalf("failed to create test store: %v", err)
	}

	// 1 Penjualan tunai 100.000
	trxSale := models.Transaction{
		StoreID:     testStoreID,
		Type:        "sale",
		Status:      "completed",
		TotalAmount: 100000,
		OccurredAt:  time.Now(),
	}
	tx.Create(&trxSale)
	tx.Create(&models.TransactionPayment{
		TransactionID: trxSale.ID,
		PaymentMethod: "cash",
		Amount:        100000,
	})

	// 1 Pembelian tunai lunas 500.000 (stock_purchases)
	purchasePaid := models.Purchase{
		StoreID:       testStoreID,
		InvoiceNumber: "INV-PAID-001",
		PurchaseDate:  time.Now(),
		TotalAmount:   500000,
		PaymentStatus: "paid",
		PaymentMethod: "cash",
	}
	tx.Create(&purchasePaid)

	// 1 Pembelian pending 200.000 (MUST NOT count in cash out until paid)
	purchasePending := models.Purchase{
		StoreID:       testStoreID,
		InvoiceNumber: "INV-PENDING-001",
		PurchaseDate:  time.Now(),
		TotalAmount:   200000,
		PaymentStatus: "pending",
		PaymentMethod: "cash",
	}
	tx.Create(&purchasePending)

	// 1 Biaya listrik 50.000 (operating_expenses)
	trxExpense := models.Transaction{
		StoreID:     testStoreID,
		Type:        "expense",
		Status:      "completed",
		TotalAmount: 50000,
		OccurredAt:  time.Now(),
	}
	tx.Create(&trxExpense)
	tx.Create(&models.TransactionPayment{
		TransactionID: trxExpense.ID,
		PaymentMethod: "cash",
		Amount:        50000,
	})

	svc := services.NewReportService(tx)

	// 1. Check Cash Flow
	cf, err := svc.GetCashFlow(testStoreID, todayStr, todayStr)
	if err != nil {
		t.Fatalf("GetCashFlow failed: %v", err)
	}

	if cf.CashIn != 100000 {
		t.Errorf("CashIn mismatch: expected 100000, got %d", cf.CashIn)
	}
	if cf.OperatingExpenses != 50000 {
		t.Errorf("OperatingExpenses mismatch: expected 50000, got %d", cf.OperatingExpenses)
	}
	if cf.StockPurchases != 500000 {
		t.Errorf("StockPurchases mismatch: expected 500000, got %d", cf.StockPurchases)
	}
	if cf.CashOut != 550000 {
		t.Errorf("CashOut mismatch: expected 550000, got %d", cf.CashOut)
	}
	if cf.NetCashFlow != -450000 {
		t.Errorf("NetCashFlow mismatch: expected -450000, got %d", cf.NetCashFlow)
	}

	// 2. Check Profit & Loss (P&L must NOT be affected by the 500,000 stock purchase)
	pl, err := svc.GetProfitLoss(testStoreID, todayStr, todayStr)
	if err != nil {
		t.Fatalf("GetProfitLoss failed: %v", err)
	}

	if pl.GrossSales != 100000 {
		t.Errorf("P&L GrossSales mismatch: expected 100000, got %d", pl.GrossSales)
	}
	if pl.Expenses != 50000 {
		t.Errorf("P&L Expenses mismatch: expected 50000 (operational only), got %d", pl.Expenses)
	}
	// Net profit: 100,000 - 50,000 = 50,000 (NOT reduced by 500,000 inventory purchase!)
	if pl.NetProfit != 50000 {
		t.Errorf("P&L NetProfit mismatch: expected 50000, got %d", pl.NetProfit)
	}
}

func TestReportService_SupplierDebtRepayment_Fixture(t *testing.T) {
	db := getTestDB(t)

	tx := db.Begin()
	defer tx.Rollback()

	testStoreID := uint(888805)

	store := models.Store{
		ID:   testStoreID,
		Name: "Test Store FASE 3",
	}
	if err := tx.Create(&store).Error; err != nil {
		t.Fatalf("failed to create test store: %v", err)
	}

	dateJan01, _ := time.Parse("2006-01-02", "2026-01-01")

	// 1. Pembelian tempo 1.000.000 pada 1 Januari (payment_status = 'pending')
	purchase := models.Purchase{
		StoreID:       testStoreID,
		InvoiceNumber: "INV-TEMPO-001",
		PurchaseDate:  dateJan01,
		TotalAmount:   1000000,
		PaymentStatus: "pending",
		PaymentMethod: "debt",
	}
	tx.Create(&purchase)

	purchaseRepo := repository.NewPurchaseRepository(tx)
	purchaseSvc := services.NewPurchaseService(tx, purchaseRepo)
	reportSvc := services.NewReportService(tx)

	// Sebelum ada pembayaran:
	// Laporan 1–31 Januari: kas keluar belanja stok = 0 (belum dibayar)
	cfPre, err := reportSvc.GetCashFlow(testStoreID, "2026-01-01", "2026-01-31")
	if err != nil {
		t.Fatalf("GetCashFlow pre failed: %v", err)
	}
	if cfPre.StockPurchases != 0 {
		t.Errorf("expected 0 stock purchases before payment, got %d", cfPre.StockPurchases)
	}

	// 2. Cicilan 400.000 pada 10 Januari via AddPayment
	_, err = purchaseSvc.AddPayment(testStoreID, purchase.ID, services.CreateSupplierPaymentRequest{
		Amount:        400000,
		PaymentMethod: "transfer",
		PaymentDate:   "2026-01-10",
		Notes:         "Cicilan 1",
	})
	if err != nil {
		t.Fatalf("AddPayment cicilan 1 failed: %v", err)
	}

	// 3. Pelunasan 600.000 pada 20 Januari via AddPayment
	_, err = purchaseSvc.AddPayment(testStoreID, purchase.ID, services.CreateSupplierPaymentRequest{
		Amount:        600000,
		PaymentMethod: "cash",
		PaymentDate:   "2026-01-20",
		Notes:         "Pelunasan",
	})
	if err != nil {
		t.Fatalf("AddPayment pelunasan failed: %v", err)
	}

	// Verifikasi purchase status menjadi 'paid' setelah pelunasan penuh
	var updatedPurchase models.Purchase
	tx.First(&updatedPurchase, purchase.ID)
	if updatedPurchase.PaymentStatus != "paid" {
		t.Errorf("expected purchase payment_status 'paid', got %q", updatedPurchase.PaymentStatus)
	}

	// 4. Laporan 1–15 Januari: kas keluar hanya 400.000
	cfPart1, err := reportSvc.GetCashFlow(testStoreID, "2026-01-01", "2026-01-15")
	if err != nil {
		t.Fatalf("GetCashFlow part 1 failed: %v", err)
	}
	if cfPart1.StockPurchases != 400000 {
		t.Errorf("Period 1-15 Jan: expected StockPurchases 400000, got %d", cfPart1.StockPurchases)
	}

	// 5. Laporan 16–31 Januari: kas keluar hanya 600.000
	cfPart2, err := reportSvc.GetCashFlow(testStoreID, "2026-01-16", "2026-01-31")
	if err != nil {
		t.Fatalf("GetCashFlow part 2 failed: %v", err)
	}
	if cfPart2.StockPurchases != 600000 {
		t.Errorf("Period 16-31 Jan: expected StockPurchases 600000, got %d", cfPart2.StockPurchases)
	}

	// 6. Laporan 1–31 Januari: total kas keluar 1.000.000
	cfFull, err := reportSvc.GetCashFlow(testStoreID, "2026-01-01", "2026-01-31")
	if err != nil {
		t.Fatalf("GetCashFlow full failed: %v", err)
	}
	if cfFull.StockPurchases != 1000000 {
		t.Errorf("Period 1-31 Jan: expected StockPurchases 1000000, got %d", cfFull.StockPurchases)
	}

	// 7. Di semua periode, laba rugi TIDAK terpengaruh pembayaran utang ini
	plFull, err := reportSvc.GetProfitLoss(testStoreID, "2026-01-01", "2026-01-31")
	if err != nil {
		t.Fatalf("GetProfitLoss failed: %v", err)
	}
	if plFull.Expenses != 0 {
		t.Errorf("P&L Expenses must remain 0, got %d", plFull.Expenses)
	}
}


