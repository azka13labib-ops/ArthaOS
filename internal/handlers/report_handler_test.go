package handlers_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"app/internal/handlers"
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type stubReportService struct {
	plReport        *services.ProfitLossReport
	stockReport     *services.StockValuationReport
	cfReport        *services.CashFlowReport
	dashboardReport *services.DashboardMetrics
	err             error
}

func (s *stubReportService) GetProfitLoss(storeID uint, startDate, endDate string) (*services.ProfitLossReport, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.plReport != nil {
		return s.plReport, nil
	}
	return &services.ProfitLossReport{
		GrossSales:    1000000,
		COGS:          600000,
		GrossProfit:   400000,
		Expenses:      150000,
		NetProfit:     250000,
		TotalSales:    1000000,
		TotalCost:     600000,
		TotalExpenses: 150000,
	}, nil
}

func (s *stubReportService) GetStockValuation(storeID uint) (*services.StockValuationReport, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.stockReport != nil {
		return s.stockReport, nil
	}
	return &services.StockValuationReport{
		TotalInventoryItems:  50,
		TotalAssetCost:       500000,
		TotalAssetRetail:     850000,
		PotentialGrossProfit: 350000,
		TotalItems:           50,
		TotalValue:           500000,
	}, nil
}

func (s *stubReportService) GetCashFlow(storeID uint, startDate, endDate string) (*services.CashFlowReport, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.cfReport != nil {
		return s.cfReport, nil
	}
	return &services.CashFlowReport{
		CashIn:            1000000,
		OperatingExpenses: 50000,
		StockPurchases:    100000,
		CashOut:           150000,
		NetCashFlow:       850000,
		PaymentMethods: []services.PaymentBreakdown{
			{Method: "cash", Amount: 700000},
			{Method: "qris", Amount: 300000},
		},
	}, nil
}

func (s *stubReportService) GetDashboardMetrics(storeID uint) (*services.DashboardMetrics, error) {
	if s.err != nil {
		return nil, s.err
	}
	if s.dashboardReport != nil {
		return s.dashboardReport, nil
	}
	return &services.DashboardMetrics{
		TodaySales:        500000,
		TodayExpenses:     100000,
		TodayTransactions: 15,
		TopProducts: []services.TopProduct{
			{Name: "Kopi Susu", Quantity: 20},
		},
	}, nil
}

func TestReportHandler_GetProfitLoss_JSONContract(t *testing.T) {
	app := fiber.New()
	stub := &stubReportService{}
	h := handlers.NewReportHandler(stub)

	app.Get("/reports/profit-loss", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		return h.GetProfitLoss(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/reports/profit-loss?start_date=2026-01-01&end_date=2026-01-31", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var raw map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	requiredKeys := []string{"gross_sales", "cogs", "gross_profit", "expenses", "net_profit"}
	for _, key := range requiredKeys {
		if _, exists := raw[key]; !exists {
			t.Errorf("expected JSON key %q missing in ProfitLoss response", key)
		}
	}

	// Verify values match stub
	if int64(raw["gross_sales"].(float64)) != 1000000 {
		t.Errorf("expected gross_sales 1000000, got %v", raw["gross_sales"])
	}
	if int64(raw["cogs"].(float64)) != 600000 {
		t.Errorf("expected cogs 600000, got %v", raw["cogs"])
	}
	if int64(raw["gross_profit"].(float64)) != 400000 {
		t.Errorf("expected gross_profit 400000, got %v", raw["gross_profit"])
	}
	if int64(raw["expenses"].(float64)) != 150000 {
		t.Errorf("expected expenses 150000, got %v", raw["expenses"])
	}
	if int64(raw["net_profit"].(float64)) != 250000 {
		t.Errorf("expected net_profit 250000, got %v", raw["net_profit"])
	}
}

func TestReportHandler_GetStockValuation_JSONContract(t *testing.T) {
	app := fiber.New()
	stub := &stubReportService{}
	h := handlers.NewReportHandler(stub)

	app.Get("/reports/stock-valuation", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		return h.GetStockValuation(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/reports/stock-valuation", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var raw map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	requiredKeys := []string{
		"total_inventory_items",
		"total_asset_cost",
		"total_asset_retail",
		"potential_gross_profit",
	}
	for _, key := range requiredKeys {
		if _, exists := raw[key]; !exists {
			t.Errorf("expected JSON key %q missing in StockValuation response", key)
		}
	}

	if int64(raw["total_inventory_items"].(float64)) != 50 {
		t.Errorf("expected total_inventory_items 50, got %v", raw["total_inventory_items"])
	}
	if int64(raw["total_asset_cost"].(float64)) != 500000 {
		t.Errorf("expected total_asset_cost 500000, got %v", raw["total_asset_cost"])
	}
	if int64(raw["total_asset_retail"].(float64)) != 850000 {
		t.Errorf("expected total_asset_retail 850000, got %v", raw["total_asset_retail"])
	}
	if int64(raw["potential_gross_profit"].(float64)) != 350000 {
		t.Errorf("expected potential_gross_profit 350000, got %v", raw["potential_gross_profit"])
	}
}

func TestReportHandler_GetCashFlow_JSONContract(t *testing.T) {
	app := fiber.New()
	stub := &stubReportService{}
	h := handlers.NewReportHandler(stub)

	app.Get("/reports/cash-flow", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		return h.GetCashFlow(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/reports/cash-flow?start_date=2026-01-01&end_date=2026-01-31", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var raw map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	requiredKeys := []string{"cash_in", "operating_expenses", "stock_purchases", "cash_out", "net_cash_flow", "payment_methods"}
	for _, key := range requiredKeys {
		if _, exists := raw[key]; !exists {
			t.Errorf("expected JSON key %q missing in CashFlow response", key)
		}
	}

	if int64(raw["cash_in"].(float64)) != 1000000 {
		t.Errorf("expected cash_in 1000000, got %v", raw["cash_in"])
	}
	if int64(raw["operating_expenses"].(float64)) != 50000 {
		t.Errorf("expected operating_expenses 50000, got %v", raw["operating_expenses"])
	}
	if int64(raw["stock_purchases"].(float64)) != 100000 {
		t.Errorf("expected stock_purchases 100000, got %v", raw["stock_purchases"])
	}
	if int64(raw["cash_out"].(float64)) != 150000 {
		t.Errorf("expected cash_out 150000, got %v", raw["cash_out"])
	}
	if int64(raw["net_cash_flow"].(float64)) != 850000 {
		t.Errorf("expected net_cash_flow 850000, got %v", raw["net_cash_flow"])
	}
}

