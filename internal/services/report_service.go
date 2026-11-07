package services

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type ProfitLossReport struct {
	GrossSales    int64 `json:"gross_sales"`
	COGS          int64 `json:"cogs"`
	GrossProfit   int64 `json:"gross_profit"`
	Expenses      int64 `json:"expenses"`
	NetProfit     int64 `json:"net_profit"`
	// Backwards compatibility aliases
	TotalSales    int64 `json:"total_sales,omitempty"`
	TotalCost     int64 `json:"total_cost,omitempty"`
	TotalExpenses int64 `json:"total_expenses,omitempty"`
}

type StockValuationReport struct {
	TotalInventoryItems       int64 `json:"total_inventory_items"`
	TotalAssetCost            int64 `json:"total_asset_cost"`
	TotalAssetRetail          int64 `json:"total_asset_retail"`
	PotentialGrossProfit      int64 `json:"potential_gross_profit"`
	ProductAssetCost          int64 `json:"product_asset_cost"`
	ProductAssetRetail        int64 `json:"product_asset_retail"`
	ProductInventoryItems     int64 `json:"product_inventory_items"`
	RawMaterialAssetCost      int64 `json:"raw_material_asset_cost"`
	RawMaterialInventoryItems int64 `json:"raw_material_inventory_items"`
	// Backwards compatibility aliases
	TotalItems int64 `json:"total_items,omitempty"`
	TotalValue int64 `json:"total_value,omitempty"`
}

type PaymentBreakdown struct {
	Method string `json:"method"`
	Amount int64  `json:"amount"`
}

type CashFlowReport struct {
	CashIn            int64              `json:"cash_in"`
	OperatingExpenses int64              `json:"operating_expenses"`
	StockPurchases    int64              `json:"stock_purchases"`
	CashOut           int64              `json:"cash_out"`
	NetCashFlow       int64              `json:"net_cash_flow"`
	PaymentMethods    []PaymentBreakdown `json:"payment_methods"`
}

type TopProduct struct {
	Name     string `json:"name"`
	Quantity int    `json:"quantity"`
}

type DashboardMetrics struct {
	TodaySales        int64        `json:"today_sales"`
	TodayExpenses     int64        `json:"today_expenses"`
	TodayTransactions int64        `json:"today_transactions"`
	TopProducts       []TopProduct `json:"top_products"`
}

type ReportService interface {
	GetProfitLoss(storeID uint, startDate, endDate string) (*ProfitLossReport, error)
	GetStockValuation(storeID uint) (*StockValuationReport, error)
	GetCashFlow(storeID uint, startDate, endDate string) (*CashFlowReport, error)
	GetDashboardMetrics(storeID uint) (*DashboardMetrics, error)
}

type reportService struct {
	db *gorm.DB
}

func NewReportService(db *gorm.DB) ReportService {
	return &reportService{db}
}

func (s *reportService) getStoreTimezone(storeID uint) string {
	var tz string
	_ = s.db.Model(&models.Store{}).Where("id = ?", storeID).Select("timezone").Scan(&tz).Error
	if tz == "" {
		tz = "Asia/Jakarta"
	}
	return tz
}

func (s *reportService) GetProfitLoss(storeID uint, startDate, endDate string) (*ProfitLossReport, error) {
	tz := s.getStoreTimezone(storeID)

	var grossSales int64
	err := s.db.Raw(`
		SELECT COALESCE(SUM(total_amount), 0)
		FROM transactions
		WHERE store_id = ? AND type = 'sale' AND status != 'voided' 
			AND (occurred_at AT TIME ZONE ?)::date BETWEEN ?::date AND ?::date
	`, storeID, tz, startDate, endDate).Scan(&grossSales).Error
	if err != nil {
		return nil, err
	}

	var cogs int64
	err = s.db.Raw(`
		SELECT COALESCE(SUM(ti.cost_price * ti.quantity), 0)
		FROM transaction_items ti
		JOIN transactions t ON t.id = ti.transaction_id
		WHERE t.store_id = ? AND t.type = 'sale' AND t.status != 'voided' 
			AND (t.occurred_at AT TIME ZONE ?)::date BETWEEN ?::date AND ?::date
	`, storeID, tz, startDate, endDate).Scan(&cogs).Error
	if err != nil {
		return nil, err
	}

	var expenses int64
	err = s.db.Raw(`
		SELECT COALESCE(SUM(total_amount), 0)
		FROM transactions
		WHERE store_id = ? AND type = 'expense' AND status != 'voided' 
			AND (occurred_at AT TIME ZONE ?)::date BETWEEN ?::date AND ?::date
	`, storeID, tz, startDate, endDate).Scan(&expenses).Error
	if err != nil {
		return nil, err
	}

	grossProfit := grossSales - cogs
	netProfit := grossProfit - expenses

	return &ProfitLossReport{
		GrossSales:    grossSales,
		COGS:          cogs,
		GrossProfit:   grossProfit,
		Expenses:      expenses,
		NetProfit:     netProfit,
		TotalSales:    grossSales,
		TotalCost:     cogs,
		TotalExpenses: expenses,
	}, nil
}

func (s *reportService) GetStockValuation(storeID uint) (*StockValuationReport, error) {
	var result struct {
		TotalInventoryItems int64
		TotalAssetCost      int64
		TotalAssetRetail    int64
	}
	err := s.db.Raw(`
		SELECT 
			COALESCE(SUM(current_stock), 0) as total_inventory_items,
			COALESCE(SUM(current_stock * buy_price), 0) as total_asset_cost,
			COALESCE(SUM(current_stock * sell_price), 0) as total_asset_retail
		FROM products
		WHERE store_id = ? AND is_active = true
	`, storeID).Scan(&result).Error

	if err != nil {
		return nil, err
	}

	var rmResult struct {
		TotalRawMaterialItems int64
		TotalRawMaterialCost  int64
	}
	err = s.db.Raw(`
		SELECT 
			COALESCE(SUM(current_stock), 0) as total_raw_material_items,
			COALESCE(SUM(current_stock * cost_per_unit), 0) as total_raw_material_cost
		FROM raw_materials
		WHERE store_id = ?
	`, storeID).Scan(&rmResult).Error

	if err != nil {
		return nil, err
	}

	totalAssetCost := result.TotalAssetCost + rmResult.TotalRawMaterialCost
	potentialGrossProfit := result.TotalAssetRetail - totalAssetCost

	return &StockValuationReport{
		TotalInventoryItems:       result.TotalInventoryItems,
		TotalAssetCost:            totalAssetCost,
		TotalAssetRetail:          result.TotalAssetRetail,
		PotentialGrossProfit:      potentialGrossProfit,
		ProductAssetCost:          result.TotalAssetCost,
		ProductAssetRetail:        result.TotalAssetRetail,
		ProductInventoryItems:     result.TotalInventoryItems,
		RawMaterialAssetCost:      rmResult.TotalRawMaterialCost,
		RawMaterialInventoryItems: rmResult.TotalRawMaterialItems,
		TotalItems:                result.TotalInventoryItems,
		TotalValue:                totalAssetCost,
	}, nil
}

func (s *reportService) GetCashFlow(storeID uint, startDate, endDate string) (*CashFlowReport, error) {
	tz := s.getStoreTimezone(storeID)

	// Cash flow follows actual payment methods, not sale totals: debt is receivable, not cash in.
	var cashIn int64
	err := s.db.Raw(`
		SELECT COALESCE(SUM(tp.amount), 0)
		FROM transaction_payments tp
		JOIN transactions t ON t.id = tp.transaction_id
		WHERE t.store_id = ?
			AND t.status != 'voided'
			AND t.type IN ('sale', 'debt_payment')
			AND tp.payment_method != 'debt'
			AND (t.occurred_at AT TIME ZONE ?)::date BETWEEN ?::date AND ?::date
	`, storeID, tz, startDate, endDate).Scan(&cashIn).Error
	if err != nil {
		return nil, err
	}

	var operatingExpenses int64
	err = s.db.Raw(`
		SELECT COALESCE(SUM(tp.amount), 0)
		FROM transaction_payments tp
		JOIN transactions t ON t.id = tp.transaction_id
		WHERE t.store_id = ? AND t.status != 'voided' AND t.type = 'expense' 
			AND (t.occurred_at AT TIME ZONE ?)::date BETWEEN ?::date AND ?::date
	`, storeID, tz, startDate, endDate).Scan(&operatingExpenses).Error
	if err != nil {
		return nil, err
	}

	var stockPurchases int64
	err = s.db.Raw(`
		SELECT COALESCE(SUM(total), 0) FROM (
			-- Direct upfront cash/transfer purchases (not credit/tempo, no separate installment payments)
			SELECT COALESCE(SUM(total_amount), 0) AS total
			FROM purchases
			WHERE store_id = ?
				AND payment_status = 'paid'
				AND payment_method != 'debt'
				AND id NOT IN (SELECT purchase_id FROM supplier_payments WHERE store_id = ?)
				AND (purchase_date AT TIME ZONE ?)::date BETWEEN ?::date AND ?::date
			UNION ALL
			-- Supplier debt/tempo repayments recorded on actual payment_date
			SELECT COALESCE(SUM(amount), 0) AS total
			FROM supplier_payments
			WHERE store_id = ?
				AND (payment_date AT TIME ZONE ?)::date BETWEEN ?::date AND ?::date
		) combined
	`, storeID, storeID, tz, startDate, endDate, storeID, tz, startDate, endDate).Scan(&stockPurchases).Error
	if err != nil {
		return nil, err
	}

	cashOut := operatingExpenses + stockPurchases

	var paymentMethods []PaymentBreakdown
	if err := s.db.Raw(`
		SELECT tp.payment_method AS method, COALESCE(SUM(tp.amount), 0) AS amount
		FROM transaction_payments tp
		JOIN transactions t ON t.id = tp.transaction_id
		WHERE t.store_id = ?
			AND t.status != 'voided'
			AND t.type IN ('sale', 'debt_payment')
			AND tp.payment_method != 'debt'
			AND (t.occurred_at AT TIME ZONE ?)::date BETWEEN ?::date AND ?::date
		GROUP BY tp.payment_method
	`, storeID, tz, startDate, endDate).Scan(&paymentMethods).Error; err != nil {
		return nil, err
	}

	netCashFlow := cashIn - cashOut

	return &CashFlowReport{
		CashIn:            cashIn,
		OperatingExpenses: operatingExpenses,
		StockPurchases:    stockPurchases,
		CashOut:           cashOut,
		NetCashFlow:       netCashFlow,
		PaymentMethods:    paymentMethods,
	}, nil
}

func (s *reportService) GetDashboardMetrics(storeID uint) (*DashboardMetrics, error) {
	tz := s.getStoreTimezone(storeID)

	// A summary for the dashboard
	var totalSales int64
	if err := s.db.Raw(`
		SELECT COALESCE(SUM(total_amount), 0) 
		FROM transactions 
		WHERE store_id = ? AND type = 'sale' AND status != 'voided' 
			AND (occurred_at AT TIME ZONE ?)::date = (CURRENT_TIMESTAMP AT TIME ZONE ?)::date
	`, storeID, tz, tz).Scan(&totalSales).Error; err != nil {
		return nil, err
	}

	var totalExpenses int64
	if err := s.db.Raw(`
		SELECT COALESCE(SUM(total_amount), 0) 
		FROM transactions 
		WHERE store_id = ? AND type = 'expense' AND status != 'voided' 
			AND (occurred_at AT TIME ZONE ?)::date = (CURRENT_TIMESTAMP AT TIME ZONE ?)::date
	`, storeID, tz, tz).Scan(&totalExpenses).Error; err != nil {
		return nil, err
	}

	var totalTransactions int64
	if err := s.db.Raw(`
		SELECT COUNT(*) 
		FROM transactions 
		WHERE store_id = ? AND type = 'sale' AND status != 'voided' 
			AND (occurred_at AT TIME ZONE ?)::date = (CURRENT_TIMESTAMP AT TIME ZONE ?)::date
	`, storeID, tz, tz).Scan(&totalTransactions).Error; err != nil {
		return nil, err
	}

	var topProducts []TopProduct
	if err := s.db.Raw(`
		SELECT p.name, COALESCE(SUM(ti.quantity), 0) as quantity
		FROM transaction_items ti
		JOIN transactions t ON t.id = ti.transaction_id
		JOIN products p ON p.id = ti.product_id
		WHERE t.store_id = ? AND t.type = 'sale' AND t.status != 'voided' 
			AND (t.occurred_at AT TIME ZONE ?)::date = (CURRENT_TIMESTAMP AT TIME ZONE ?)::date
		GROUP BY p.name
		ORDER BY quantity DESC
		LIMIT 5
	`, storeID, tz, tz).Scan(&topProducts).Error; err != nil {
		return nil, err
	}

	return &DashboardMetrics{
		TodaySales:        totalSales,
		TodayExpenses:     totalExpenses,
		TodayTransactions: totalTransactions,
		TopProducts:       topProducts,
	}, nil
}
