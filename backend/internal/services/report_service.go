package services

import (
	"gorm.io/gorm"
)

type ReportService interface {
	GetProfitLoss(storeID uint, startDate, endDate string) (map[string]interface{}, error)
	GetStockValuation(storeID uint) (map[string]interface{}, error)
	GetCashFlow(storeID uint, startDate, endDate string) (map[string]interface{}, error)
	GetDashboardMetrics(storeID uint) (map[string]interface{}, error)
}

type reportService struct {
	db *gorm.DB
}

func NewReportService(db *gorm.DB) ReportService {
	return &reportService{db}
}

func (s *reportService) GetProfitLoss(storeID uint, startDate, endDate string) (map[string]interface{}, error) {
	var totalSales int64
	err := s.db.Raw(`
		SELECT COALESCE(SUM(total_amount), 0)
		FROM transactions
		WHERE store_id = ? AND type = 'sale' AND created_at >= ? AND created_at <= ?
	`, storeID, startDate, endDate).Scan(&totalSales).Error
	if err != nil {
		return nil, err
	}

	var totalCost int64
	err = s.db.Raw(`
		SELECT COALESCE(SUM(ti.cost_price * ti.quantity), 0)
		FROM transaction_items ti
		JOIN transactions t ON t.id = ti.transaction_id
		WHERE t.store_id = ? AND t.type = 'sale' AND t.created_at >= ? AND t.created_at <= ?
	`, storeID, startDate, endDate).Scan(&totalCost).Error
	if err != nil {
		return nil, err
	}

	var totalExpenses int64
	err = s.db.Raw(`
		SELECT COALESCE(SUM(total_amount), 0)
		FROM transactions
		WHERE store_id = ? AND type = 'expense' AND created_at >= ? AND created_at <= ?
	`, storeID, startDate, endDate).Scan(&totalExpenses).Error
	if err != nil {
		return nil, err
	}

	grossProfit := totalSales - totalCost
	netProfit := grossProfit - totalExpenses

	return map[string]interface{}{
		"total_sales":    totalSales,
		"total_cost":     totalCost,
		"gross_profit":   grossProfit,
		"total_expenses": totalExpenses,
		"net_profit":     netProfit,
	}, nil
}

func (s *reportService) GetStockValuation(storeID uint) (map[string]interface{}, error) {
	var result struct {
		TotalItems int64
		TotalValue int64
	}
	err := s.db.Raw(`
		SELECT 
			COALESCE(SUM(current_stock), 0) as total_items,
			COALESCE(SUM(current_stock * buy_price), 0) as total_value
		FROM products
		WHERE store_id = ? AND is_active = true
	`, storeID).Scan(&result).Error

	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_items": result.TotalItems,
		"total_value": result.TotalValue,
	}, nil
}

func (s *reportService) GetCashFlow(storeID uint, startDate, endDate string) (map[string]interface{}, error) {
	// Simple cash flow: Cash In (Sales, paid debts) and Cash Out (Expenses)
	var cashIn int64
	err := s.db.Raw(`
		SELECT COALESCE(SUM(total_amount), 0)
		FROM transactions
		WHERE store_id = ? AND type = 'sale' AND created_at >= ? AND created_at <= ?
	`, storeID, startDate, endDate).Scan(&cashIn).Error
	if err != nil {
		return nil, err
	}

	var cashOut int64
	err = s.db.Raw(`
		SELECT COALESCE(SUM(total_amount), 0)
		FROM transactions
		WHERE store_id = ? AND type = 'expense' AND created_at >= ? AND created_at <= ?
	`, storeID, startDate, endDate).Scan(&cashOut).Error
	if err != nil {
		return nil, err
	}

	type PaymentBreakdown struct {
		Method string `json:"method"`
		Amount int64  `json:"amount"`
	}

	var paymentMethods []PaymentBreakdown
	s.db.Raw(`
		SELECT payment_method as method, COALESCE(SUM(total_amount), 0) as amount
		FROM transactions
		WHERE store_id = ? AND type = 'sale' AND created_at >= ? AND created_at <= ?
		GROUP BY payment_method
	`, storeID, startDate, endDate).Scan(&paymentMethods)

	netCashFlow := cashIn - cashOut

	return map[string]interface{}{
		"cash_in":         cashIn,
		"cash_out":        cashOut,
		"net_cash_flow":   netCashFlow,
		"payment_methods": paymentMethods,
	}, nil
}

func (s *reportService) GetDashboardMetrics(storeID uint) (map[string]interface{}, error) {
	// A summary for the dashboard
	var totalSales int64
	s.db.Raw("SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE store_id = ? AND type = 'sale' AND DATE(created_at) = CURRENT_DATE", storeID).Scan(&totalSales)
	
	var totalExpenses int64
	s.db.Raw("SELECT COALESCE(SUM(total_amount), 0) FROM transactions WHERE store_id = ? AND type = 'expense' AND DATE(created_at) = CURRENT_DATE", storeID).Scan(&totalExpenses)

	var totalTransactions int64
	s.db.Raw("SELECT COUNT(*) FROM transactions WHERE store_id = ? AND type = 'sale' AND DATE(created_at) = CURRENT_DATE", storeID).Scan(&totalTransactions)

	type TopProduct struct {
		Name     string `json:"name"`
		Quantity int    `json:"quantity"`
	}
	var topProducts []TopProduct
	s.db.Raw(`
		SELECT p.name, COALESCE(SUM(ti.quantity), 0) as quantity
		FROM transaction_items ti
		JOIN transactions t ON t.id = ti.transaction_id
		JOIN products p ON p.id = ti.product_id
		WHERE t.store_id = ? AND t.type = 'sale' AND DATE(t.created_at) = CURRENT_DATE
		GROUP BY p.name
		ORDER BY quantity DESC
		LIMIT 5
	`, storeID).Scan(&topProducts)

	return map[string]interface{}{
		"today_sales":        totalSales,
		"today_expenses":     totalExpenses,
		"today_transactions": totalTransactions,
		"top_products":       topProducts,
	}, nil
}
