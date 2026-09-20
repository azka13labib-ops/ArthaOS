package handlers

import (
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type ReportHandler struct {
	reportService services.ReportService
}

func NewReportHandler(reportService services.ReportService) *ReportHandler {
	return &ReportHandler{reportService}
}

func (h *ReportHandler) GetProfitLoss(c fiber.Ctx) error {
	storeID, _ := c.Locals("store_id").(uint)

	startDate := c.Query("start_date", "1970-01-01")
	endDate := c.Query("end_date", "2100-01-01")

	report, err := h.reportService.GetProfitLoss(storeID, startDate, endDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate report"})
	}

	return c.JSON(report)
}

func (h *ReportHandler) GetStockValuation(c fiber.Ctx) error {
	storeID, _ := c.Locals("store_id").(uint)

	report, err := h.reportService.GetStockValuation(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate stock valuation"})
	}

	return c.JSON(report)
}
