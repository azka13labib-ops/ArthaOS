package handlers

import (
	"app/internal/services"
	appvalidator "app/pkg/validator"

	"github.com/gofiber/fiber/v3"
)

type CustomerHandler struct {
	customerService services.CustomerService
}

func NewCustomerHandler(customerService services.CustomerService) *CustomerHandler {
	return &CustomerHandler{customerService}
}

type CreateCustomerRequest struct {
	Name        string  `json:"name"         validate:"required,min=1,max=200"`
	Phone       *string `json:"phone"`
	PhoneNumber *string `json:"phone_number"`
}

func (h *CustomerHandler) Create(c fiber.Ctx) error {

	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	var req CreateCustomerRequest
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

	phone := req.Phone
	if phone == nil || *phone == "" {
		phone = req.PhoneNumber
	}

	customer, err := h.customerService.CreateCustomer(storeID, req.Name, phone)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create customer",
			"code":  "CREATE_FAILED",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(customer)
}

func (h *CustomerHandler) GetAll(c fiber.Ctx) error {

	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	customers, err := h.customerService.GetCustomers(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch customers",
			"code":  "FETCH_FAILED",
		})
	}

	return c.JSON(customers)
}
