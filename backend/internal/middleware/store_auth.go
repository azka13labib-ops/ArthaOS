package middleware

import (
	"strconv"

	"app/internal/repository"

	"github.com/gofiber/fiber/v3"
)

func StoreMiddleware(storeRepo repository.StoreRepository) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, ok := c.Locals("user_id").(uint)
		if !ok || userID == 0 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not authenticated"})
		}

		storeIDParam := c.Params("storeId")
		if storeIDParam == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Missing storeId parameter"})
		}

		storeID, err := strconv.ParseUint(storeIDParam, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid storeId parameter"})
		}

		member, err := storeRepo.GetMember(uint(storeID), userID)
		if err != nil {

			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied to this store"})
		}

		c.Locals("store_id", uint(storeID))
		c.Locals("store_role", member.Role)

		return c.Next()
	}
}
