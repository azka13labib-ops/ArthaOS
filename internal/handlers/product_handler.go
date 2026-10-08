package handlers

import (
	"strconv"

	"app/internal/services"
	appvalidator "app/pkg/validator"

	"github.com/gofiber/fiber/v3"
)

type ProductHandler struct {
	invService services.InventoryService
}

func NewProductHandler(invService services.InventoryService) *ProductHandler {
	return &ProductHandler{invService}
}

type CreateProductRequest struct {
	Name         string  `json:"name"          validate:"required,min=1,max=200"`
	SKU          string  `json:"sku"           validate:"required,min=1,max=100"`
	Barcode      *string `json:"barcode"`
	BuyPrice     int64   `json:"buy_price"     validate:"gte=0"`
	SellPrice    int64   `json:"sell_price"    validate:"gte=0"`
	InitialStock int     `json:"initial_stock" validate:"gte=0"`
}

func (h *ProductHandler) Create(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
			"code":  "UNAUTHORIZED",
		})
	}

	var req CreateProductRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
			"code":  "INVALID_BODY",
		})
	}

	if errs := appvalidator.Validate(req); errs != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "Validation failed",
			"code":   "VALIDATION_ERROR",
			"fields": errs,
		})
	}

	product, err := h.invService.CreateProduct(storeID, req.Name, req.SKU, req.Barcode, req.BuyPrice, req.SellPrice, req.InitialStock)
	if err != nil {

		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create product",
			"code":  "CREATE_FAILED",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(product)
}

type AdjustStockRequest struct {
	QuantityDelta int    `json:"quantity_delta" validate:"required"`
	Notes         string `json:"notes"          validate:"max=500"`
}

func (h *ProductHandler) AdjustStock(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	productID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid product ID",
			"code":  "INVALID_ID",
		})
	}

	var req AdjustStockRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body", "code": "INVALID_BODY"})
	}

	if errs := appvalidator.Validate(req); errs != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Validation failed", "code": "VALIDATION_ERROR", "fields": errs})
	}

	if err := h.invService.AdjustStock(storeID, uint(productID), req.QuantityDelta, req.Notes); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "ADJUST_FAILED",
		})
	}

	return c.JSON(fiber.Map{"message": "Stock adjusted successfully"})
}

func (h *ProductHandler) GetMovements(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	productID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid product ID", "code": "INVALID_ID"})
	}

	movements, err := h.invService.GetProductMovements(storeID, uint(productID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch movements",
			"code":  "FETCH_FAILED",
		})
	}

	return c.JSON(movements)
}

func (h *ProductHandler) GetAll(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	products, err := h.invService.GetProducts(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch products",
			"code":  "FETCH_FAILED",
		})
	}

	return c.JSON(products)
}
