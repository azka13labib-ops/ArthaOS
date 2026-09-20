package handlers

import (
	"app/internal/models"
	"app/internal/repository"
	appvalidator "app/pkg/validator"

	"github.com/gofiber/fiber/v3"
)

type StoreHandler struct {
	storeRepo repository.StoreRepository
}

func NewStoreHandler(storeRepo repository.StoreRepository) *StoreHandler {
	return &StoreHandler{storeRepo: storeRepo}
}

type CreateStoreRequest struct {
	Name     string `json:"name"     validate:"required,min=2,max=100"`
	Address  string `json:"address"  validate:"max=500"`
	Timezone string `json:"timezone" validate:"omitempty,max=50"`
}

func (h *StoreHandler) Create(c fiber.Ctx) error {
	var req CreateStoreRequest
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

	userIDVal := c.Locals("user_id")
	userID, ok := userIDVal.(uint)
	if !ok || userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
			"code":  "UNAUTHORIZED",
		})
	}

	tz := req.Timezone
	if tz == "" {
		tz = "Asia/Jakarta"
	}

	store := models.Store{
		Name:     req.Name,
		Address:  req.Address,
		Timezone: tz,
	}

	if err := h.storeRepo.Create(&store, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create store",
			"code":  "STORE_CREATION_FAILED",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Store created successfully",
		"store": fiber.Map{
			"id":       store.ID,
			"name":     store.Name,
			"address":  store.Address,
			"timezone": store.Timezone,
		},
	})
}

func (h *StoreHandler) List(c fiber.Ctx) error {
	userIDVal := c.Locals("user_id")
	userID, ok := userIDVal.(uint)
	if !ok || userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	stores, err := h.storeRepo.GetStoresByUserID(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch stores", "code": "FETCH_FAILED"})
	}

	return c.JSON(stores)
}

func (h *StoreHandler) GetByID(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}

	store, err := h.storeRepo.GetByID(storeID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Store not found", "code": "STORE_NOT_FOUND"})
	}

	return c.JSON(store)
}
