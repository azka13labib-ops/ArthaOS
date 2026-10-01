package handlers

import (
	"strconv"

	"app/internal/services"
	appvalidator "app/pkg/validator"

	"github.com/gofiber/fiber/v3"
)

type RecipeHandler struct {
	recipeService services.RecipeService
}

func NewRecipeHandler(recipeService services.RecipeService) *RecipeHandler {
	return &RecipeHandler{recipeService}
}

type AddRecipeItemRequest struct {
	RawMaterialID uint `json:"raw_material_id" validate:"required"`
	Quantity      int  `json:"quantity"        validate:"required,gt=0"`
}

func (h *RecipeHandler) AddItem(c fiber.Ctx) error {
	_, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	productID, err := strconv.ParseUint(c.Params("product_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Product ID"})
	}

	var req AddRecipeItemRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if errs := appvalidator.Validate(req); errs != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{"error": "Validation failed", "fields": errs})
	}

	item, err := h.recipeService.Create(uint(productID), req.RawMaterialID, req.Quantity)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to add recipe item"})
	}

	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *RecipeHandler) GetByProduct(c fiber.Ctx) error {
	_, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	productID, err := strconv.ParseUint(c.Params("product_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid Product ID"})
	}

	items, err := h.recipeService.GetByProductID(uint(productID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch recipes"})
	}

	return c.JSON(items)
}

func (h *RecipeHandler) Delete(c fiber.Ctx) error {
	_, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	if err := h.recipeService.Delete(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete recipe item"})
	}

	return c.JSON(fiber.Map{"message": "Recipe item deleted successfully"})
}
