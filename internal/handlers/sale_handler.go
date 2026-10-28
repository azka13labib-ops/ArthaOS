package handlers

import (
	"fmt"

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

type VoidSaleRequest struct {
	Reason string `json:"reason" validate:"required"`
}

// Void godoc — POST /api/v1/stores/:storeId/sales/:id/void
func (h *SaleHandler) Void(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}
	userID, _ := c.Locals("user_id").(uint)

	idStr := c.Params("id")
	if idStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Transaction ID is required", "code": "INVALID_ID"})
	}

	var req VoidSaleRequest
	if err := c.Bind().Body(&req); err != nil || req.Reason == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Alasan pembatalan (reason) wajib diisi",
			"code":  "REASON_REQUIRED",
		})
	}

	var trxID uint
	if _, err := fmt.Sscanf(idStr, "%d", &trxID); err != nil || trxID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Format ID transaksi tidak valid", "code": "INVALID_ID"})
	}

	trx, err := h.saleService.VoidSale(storeID, trxID, userID, req.Reason)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "VOID_FAILED",
		})
	}

	return c.JSON(fiber.Map{
		"message":     "Transaksi berhasil dibatalkan (void) dan stok telah dikembalikan",
		"transaction": trx,
	})
}
