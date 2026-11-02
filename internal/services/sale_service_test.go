package services_test

import (
	"testing"
	"time"

	"app/internal/models"
	"app/internal/repository"
	"app/internal/services"
)

func TestSaleService_RecipeProduct_COGS_And_RawMaterials_Fixture(t *testing.T) {
	db := getTestDB(t)

	// Run within transaction and roll back so nothing persists in DB
	tx := db.Begin()
	defer tx.Rollback()

	testStoreID := uint(888805)
	todayStr := time.Now().Format("2006-01-02")

	// Create test store
	store := models.Store{
		ID:   testStoreID,
		Name: "Test Store Resep",
	}
	if err := tx.Create(&store).Error; err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	// 1. Bahan baku kopi: cost_per_unit 500, current_stock 1000
	rmKopi := models.RawMaterial{
		StoreID:      testStoreID,
		Name:         "Kopi Arabika",
		SKU:          "RM-KOPI-01",
		Unit:         "gram",
		CostPerUnit:  500,
		CurrentStock: 1000,
	}
	if err := tx.Create(&rmKopi).Error; err != nil {
		t.Fatalf("failed to create rmKopi: %v", err)
	}

	// 2. Bahan baku susu: cost_per_unit 50, current_stock 5000
	rmSusu := models.RawMaterial{
		StoreID:      testStoreID,
		Name:         "Susu Segar",
		SKU:          "RM-SUSU-01",
		Unit:         "ml",
		CostPerUnit:  50,
		CurrentStock: 5000,
	}
	if err := tx.Create(&rmSusu).Error; err != nil {
		t.Fatalf("failed to create rmSusu: %v", err)
	}

	// 3. Produk resep 'Kopi Susu': sell_price 25000, buy_price 0, is_recipe_based = true
	prodKopiSusu := models.Product{
		StoreID:       testStoreID,
		Name:          "Kopi Susu",
		SKU:           "MENU-KOPI-SUSU",
		SellPrice:     25000,
		BuyPrice:      0,
		CurrentStock:  0,
		IsActive:      true,
		IsRecipeBased: true,
	}
	if err := tx.Create(&prodKopiSusu).Error; err != nil {
		t.Fatalf("failed to create prodKopiSusu: %v", err)
	}

	// Resep: 20 kopi + 150 susu
	recipe1 := models.RecipeItem{
		ProductID:     prodKopiSusu.ID,
		RawMaterialID: rmKopi.ID,
		Quantity:      20,
	}
	if err := tx.Create(&recipe1).Error; err != nil {
		t.Fatalf("failed to create recipe1: %v", err)
	}

	recipe2 := models.RecipeItem{
		ProductID:     prodKopiSusu.ID,
		RawMaterialID: rmSusu.ID,
		Quantity:      150,
	}
	if err := tx.Create(&recipe2).Error; err != nil {
		t.Fatalf("failed to create recipe2: %v", err)
	}

	// 4. Jual 2 porsi Kopi Susu
	prodRepo := repository.NewProductRepository(tx)
	trxRepo := repository.NewTransactionRepository(tx)
	saleSvc := services.NewSaleService(tx, prodRepo, trxRepo)

	saleReq := services.SaleRequest{
		CorrelationID: "TEST-CORR-RECIPE-001",
		Description:   "Penjualan 2 Kopi Susu",
		Items: []services.SaleRequestItem{
			{
				ProductID: prodKopiSusu.ID,
				Quantity:  2,
			},
		},
		Payments: []services.SaleRequestPayment{
			{
				Amount:        50000,
				PaymentMethod: "cash",
			},
		},
	}

	createdTrx, err := saleSvc.CreateSale(testStoreID, saleReq)
	if err != nil {
		t.Fatalf("CreateSale failed: %v", err)
	}

	if createdTrx == nil {
		t.Fatalf("expected createdTrx, got nil")
	}

	// Expected HPP per porsi = (20 * 500) + (150 * 50) = 10000 + 7500 = 17500
	expectedUnitCost := int64(17500)
	expectedTotalCost := expectedUnitCost * 2 // 35000

	if createdTrx.TotalCost != expectedTotalCost {
		t.Errorf("createdTrx.TotalCost mismatch: expected %d, got %d", expectedTotalCost, createdTrx.TotalCost)
	}
	if createdTrx.TotalAmount != 50000 {
		t.Errorf("createdTrx.TotalAmount mismatch: expected 50000, got %d", createdTrx.TotalAmount)
	}

	// Verifikasi transaction_items.cost_price == 17500
	var dbItems []models.TransactionItem
	if err := tx.Where("transaction_id = ?", createdTrx.ID).Find(&dbItems).Error; err != nil {
		t.Fatalf("failed to fetch transaction items: %v", err)
	}
	if len(dbItems) != 1 {
		t.Fatalf("expected 1 transaction item, got %d", len(dbItems))
	}
	if dbItems[0].CostPrice != expectedUnitCost {
		t.Errorf("dbItems[0].CostPrice mismatch: expected %d, got %d", expectedUnitCost, dbItems[0].CostPrice)
	}
	if dbItems[0].Quantity != 2 {
		t.Errorf("dbItems[0].Quantity mismatch: expected 2, got %d", dbItems[0].Quantity)
	}

	// Verifikasi P&L periode tersebut: gross_sales = 50000, cogs = 35000, gross_profit = 15000
	reportSvc := services.NewReportService(tx)
	plReport, err := reportSvc.GetProfitLoss(testStoreID, todayStr, todayStr)
	if err != nil {
		t.Fatalf("GetProfitLoss failed: %v", err)
	}

	if plReport.GrossSales != 50000 {
		t.Errorf("plReport.GrossSales mismatch: expected 50000, got %d", plReport.GrossSales)
	}
	if plReport.COGS != 35000 {
		t.Errorf("plReport.COGS mismatch: expected 35000, got %d", plReport.COGS)
	}
	if plReport.GrossProfit != 15000 {
		t.Errorf("plReport.GrossProfit mismatch: expected 15000, got %d", plReport.GrossProfit)
	}

	// Verifikasi stok bahan baku berkurang sesuai takaran:
	// Kopi berkurang 20 * 2 = 40 (sisa 1000 - 40 = 960)
	var updatedKopi models.RawMaterial
	if err := tx.First(&updatedKopi, rmKopi.ID).Error; err != nil {
		t.Fatalf("failed to query updatedKopi: %v", err)
	}
	if updatedKopi.CurrentStock != 960 {
		t.Errorf("updatedKopi.CurrentStock mismatch: expected 960, got %d", updatedKopi.CurrentStock)
	}

	// Susu berkurang 150 * 2 = 300 (sisa 5000 - 300 = 4700)
	var updatedSusu models.RawMaterial
	if err := tx.First(&updatedSusu, rmSusu.ID).Error; err != nil {
		t.Fatalf("failed to query updatedSusu: %v", err)
	}
	if updatedSusu.CurrentStock != 4700 {
		t.Errorf("updatedSusu.CurrentStock mismatch: expected 4700, got %d", updatedSusu.CurrentStock)
	}

	// Verifikasi inventory_movements tercatat
	var movements []models.InventoryMovement
	if err := tx.Where("store_id = ? AND reference_type = 'sale'", testStoreID).Find(&movements).Error; err != nil {
		t.Fatalf("failed to query inventory_movements: %v", err)
	}
	if len(movements) != 2 {
		t.Errorf("expected 2 inventory movements, got %d", len(movements))
	}
}

func TestSaleService_StandardProduct_BuyPrice_CostPrice(t *testing.T) {
	db := getTestDB(t)

	tx := db.Begin()
	defer tx.Rollback()

	testStoreID := uint(888806)
	store := models.Store{
		ID:   testStoreID,
		Name: "Test Store Standard POS",
	}
	if err := tx.Create(&store).Error; err != nil {
		t.Fatalf("failed to create store: %v", err)
	}

	prod := models.Product{
		StoreID:       testStoreID,
		Name:          "Air Mineral",
		SKU:           "MINERAL-01",
		SellPrice:     5000,
		BuyPrice:      3000,
		CurrentStock:  50,
		IsActive:      true,
		IsRecipeBased: false,
	}
	if err := tx.Create(&prod).Error; err != nil {
		t.Fatalf("failed to create prod: %v", err)
	}

	prodRepo := repository.NewProductRepository(tx)
	trxRepo := repository.NewTransactionRepository(tx)
	saleSvc := services.NewSaleService(tx, prodRepo, trxRepo)

	saleReq := services.SaleRequest{
		CorrelationID: "TEST-CORR-STD-001",
		Description:   "Penjualan 3 Air Mineral",
		Items: []services.SaleRequestItem{
			{
				ProductID: prod.ID,
				Quantity:  3,
			},
		},
		Payments: []services.SaleRequestPayment{
			{
				Amount:        15000,
				PaymentMethod: "cash",
			},
		},
	}

	createdTrx, err := saleSvc.CreateSale(testStoreID, saleReq)
	if err != nil {
		t.Fatalf("CreateSale failed: %v", err)
	}

	// Expected HPP per unit = 3000, TotalCost = 3000 * 3 = 9000
	if createdTrx.TotalCost != 9000 {
		t.Errorf("createdTrx.TotalCost mismatch: expected 9000, got %d", createdTrx.TotalCost)
	}
	if createdTrx.TotalAmount != 15000 {
		t.Errorf("createdTrx.TotalAmount mismatch: expected 15000, got %d", createdTrx.TotalAmount)
	}

	var dbItems []models.TransactionItem
	if err := tx.Where("transaction_id = ?", createdTrx.ID).Find(&dbItems).Error; err != nil {
		t.Fatalf("failed to fetch transaction items: %v", err)
	}
	if len(dbItems) != 1 {
		t.Fatalf("expected 1 item, got %d", len(dbItems))
	}
	if dbItems[0].CostPrice != 3000 {
		t.Errorf("dbItems[0].CostPrice mismatch: expected 3000, got %d", dbItems[0].CostPrice)
	}
}
