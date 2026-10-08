package handlers

import (
	"app/internal/models"
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type SaleHandler struct {
	saleService services.SaleService
}

func NewSaleHandler(saleService services.SaleService) *SaleHandler {
	return &SaleHandler{saleService}
}

func (h *SaleHandler) Create(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	var req services.SaleRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body", "code": "INVALID_BODY"})
	}

	if len(req.Items) == 0 {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "Sale must have at least one item",
			"code":  "VALIDATION_ERROR",
		})
	}

	trx, err := h.saleService.CreateSale(storeID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "SALE_FAILED",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(trx)
}

func (h *SaleHandler) GetAll(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	trxs, err := h.saleService.GetSales(storeID, 100, 0)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch sales", "code": "FETCH_FAILED"})
	}

	var sales []models.Transaction
	for _, t := range trxs {
		if t.Type == "sale" {
			sales = append(sales, t)
		}
	}
	if sales == nil {
		sales = []models.Transaction{}
	}
	return c.JSON(sales)
}
