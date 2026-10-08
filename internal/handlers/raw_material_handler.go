package handlers

import (
	"strconv"

	"app/internal/services"
	appvalidator "app/pkg/validator"

	"github.com/gofiber/fiber/v3"
)

type RawMaterialHandler struct {
	rmService services.RawMaterialService
}

func NewRawMaterialHandler(rmService services.RawMaterialService) *RawMaterialHandler {
	return &RawMaterialHandler{rmService}
}

type CreateRawMaterialRequest struct {
	Name         string `json:"name"          validate:"required,min=1,max=200"`
	SKU          string `json:"sku"           validate:"required,min=1,max=100"`
	Unit         string `json:"unit"          validate:"required"`
	CostPerUnit  int64  `json:"cost_per_unit" validate:"gte=0"`
	CurrentStock int    `json:"current_stock" validate:"gte=0"`
}

func (h *RawMaterialHandler) Create(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req CreateRawMaterialRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := appvalidator.Validate(req); errs != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Validation failed", "fields": errs})
	}

	rm, err := h.rmService.Create(storeID, req.Name, req.SKU, req.Unit, req.CostPerUnit, req.CurrentStock)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create raw material"})
	}

	return c.Status(fiber.StatusCreated).JSON(rm)
}

func (h *RawMaterialHandler) GetAll(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	rms, err := h.rmService.GetAll(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch raw materials"})
	}

	return c.JSON(rms)
}

type AdjustRawMaterialStockRequest struct {
	QuantityDelta int `json:"quantity_delta" validate:"required"`
}

func (h *RawMaterialHandler) AdjustStock(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var req AdjustRawMaterialStockRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := appvalidator.Validate(req); errs != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Validation failed", "fields": errs})
	}

	if err := h.rmService.UpdateStock(storeID, uint(id), req.QuantityDelta); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Stock adjusted successfully"})
}
