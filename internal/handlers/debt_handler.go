package handlers

import (
	"strconv"

	"app/internal/services"
	appvalidator "app/pkg/validator"

	"github.com/gofiber/fiber/v3"
)

type DebtHandler struct {
	debtService services.DebtService
}

func NewDebtHandler(debtService services.DebtService) *DebtHandler {
	return &DebtHandler{debtService}
}

func (h *DebtHandler) GetDebts(c fiber.Ctx) error {

	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	debts, err := h.debtService.GetDebts(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch debts",
			"code":  "FETCH_FAILED",
		})
	}

	return c.JSON(debts)
}

type PayDebtRequest struct {
	Amount        int64   `json:"amount"         validate:"required,gt=0"`
	PaymentMethod string  `json:"payment_method" validate:"required,oneof=cash transfer"`
	Notes         *string `json:"notes"`
}

func (h *DebtHandler) PayDebt(c fiber.Ctx) error {

	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	debtID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid debt ID", "code": "INVALID_ID"})
	}

	var req PayDebtRequest
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

	payment, err := h.debtService.PayDebt(storeID, uint(debtID), req.Amount, req.PaymentMethod, req.Notes)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "PAYMENT_FAILED",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(payment)
}
