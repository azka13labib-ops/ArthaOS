package handlers

import (
	"app/internal/models"
	"app/internal/services"
	appvalidator "app/pkg/validator"

	"github.com/gofiber/fiber/v3"
)

type ExpenseHandler struct {
	expenseService services.ExpenseService
}

func NewExpenseHandler(expenseService services.ExpenseService) *ExpenseHandler {
	return &ExpenseHandler{expenseService}
}

type CreateExpenseRequest struct {
	Amount      int64                         `json:"amount"      validate:"required,gt=0"`
	Category    string                        `json:"category"    validate:"omitempty,max=100"`
	Description string                        `json:"description" validate:"max=500"`
	Payments    []services.SaleRequestPayment `json:"payments"`
}

func (h *ExpenseHandler) Create(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	var req CreateExpenseRequest
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

	payments := req.Payments
	if len(payments) == 0 {
		payments = []services.SaleRequestPayment{
			{
				Amount:        req.Amount,
				PaymentMethod: "cash",
			},
		}
	}

	serviceReq := services.ExpenseRequest{
		TotalAmount: req.Amount,
		Description: req.Description,
		Payments:    payments,
	}

	trx, err := h.expenseService.CreateExpense(storeID, serviceReq)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "EXPENSE_FAILED",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(trx)
}

func (h *ExpenseHandler) GetAll(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	trxs, err := h.expenseService.GetExpenses(storeID, 100, 0)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch expenses", "code": "FETCH_FAILED"})
	}

	var expenses []models.Transaction
	for _, t := range trxs {
		if t.Type == "expense" {
			expenses = append(expenses, t)
		}
	}
	if expenses == nil {
		expenses = []models.Transaction{}
	}
	return c.JSON(expenses)
}
