package middleware

import "github.com/gofiber/fiber/v3"

func RequireRole(roles ...string) fiber.Handler {
	return func(c fiber.Ctx) error {
		role, ok := c.Locals("store_role").(string)
		if !ok || role == "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied",
				"code":  "FORBIDDEN",
			})
		}
		for _, r := range roles {
			if role == r {
				return c.Next()
			}
		}
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Insufficient permissions. Required role: " + roles[0],
			"code":  "INSUFFICIENT_ROLE",
		})
	}
}
