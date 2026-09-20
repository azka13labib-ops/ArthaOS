package services

import (
	"gorm.io/gorm"
)

type ReportService interface {
	GetProfitLoss(storeID uint, startDate, endDate string) (map[string]interface{}, error)
	GetStockValuation(storeID uint) (map[string]interface{}, error)
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
