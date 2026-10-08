package handlers

import (
	"strconv"

	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type PurchaseHandler struct {
	purchaseService services.PurchaseService
}

func NewPurchaseHandler(purchaseService services.PurchaseService) *PurchaseHandler {
	return &PurchaseHandler{purchaseService}
}

func (h *PurchaseHandler) Create(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	var req services.CreatePurchaseRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body", "code": "INVALID_BODY"})
	}

	purchase, err := h.purchaseService.Create(storeID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "CREATE_PURCHASE_FAILED",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(purchase)
}

func (h *PurchaseHandler) GetAll(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	limit := 50
	if l := c.Query("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	offset := 0
	if o := c.Query("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	purchases, total, err := h.purchaseService.List(storeID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch purchases",
			"code":  "FETCH_FAILED",
		})
	}

	return c.JSON(fiber.Map{
		"data":   purchases,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func (h *PurchaseHandler) GetByID(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid purchase ID", "code": "INVALID_ID"})
	}

	purchase, err := h.purchaseService.GetByID(uint(id), storeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Purchase not found", "code": "NOT_FOUND"})
	}

	return c.JSON(purchase)
}
