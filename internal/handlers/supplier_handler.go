package handlers

import (
	"strconv"

	"app/internal/services"
	appvalidator "app/pkg/validator"

	"github.com/gofiber/fiber/v3"
)

type SupplierHandler struct {
	supplierService services.SupplierService
}

func NewSupplierHandler(supplierService services.SupplierService) *SupplierHandler {
	return &SupplierHandler{supplierService}
}

type SupplierRequest struct {
	Name    string `json:"name" validate:"required,min=1,max=255"`
	Phone   string `json:"phone"`
	Email   string `json:"email"`
	Address string `json:"address"`
	Notes   string `json:"notes"`
}

func (h *SupplierHandler) Create(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	var req SupplierRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body", "code": "INVALID_BODY"})
	}

	if errs := appvalidator.Validate(req); errs != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "Validation failed",
			"code":   "VALIDATION_ERROR",
			"fields": errs,
		})
	}

	supplier, err := h.supplierService.Create(storeID, req.Name, req.Phone, req.Email, req.Address, req.Notes)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "CREATE_FAILED",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(supplier)
}

func (h *SupplierHandler) GetAll(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	suppliers, err := h.supplierService.List(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch suppliers",
			"code":  "FETCH_FAILED",
		})
	}

	return c.JSON(suppliers)
}

func (h *SupplierHandler) GetByID(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid supplier ID", "code": "INVALID_ID"})
	}

	supplier, err := h.supplierService.GetByID(uint(id), storeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Supplier not found", "code": "NOT_FOUND"})
	}

	return c.JSON(supplier)
}

func (h *SupplierHandler) Update(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid supplier ID", "code": "INVALID_ID"})
	}

	var req SupplierRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body", "code": "INVALID_BODY"})
	}

	if errs := appvalidator.Validate(req); errs != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "Validation failed",
			"code":   "VALIDATION_ERROR",
			"fields": errs,
		})
	}

	supplier, err := h.supplierService.Update(uint(id), storeID, req.Name, req.Phone, req.Email, req.Address, req.Notes)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error(), "code": "UPDATE_FAILED"})
	}

	return c.JSON(supplier)
}

func (h *SupplierHandler) Delete(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid supplier ID", "code": "INVALID_ID"})
	}

	if err := h.supplierService.Delete(uint(id), storeID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete supplier", "code": "DELETE_FAILED"})
	}

	return c.JSON(fiber.Map{"message": "Supplier successfully deleted"})
}
