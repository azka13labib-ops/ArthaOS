package middleware

import (
	"strings"

	"app/internal/config"
	jwt_helper "app/pkg/jwt"

	"github.com/gofiber/fiber/v3"
)

func AuthMiddleware(cfg config.Config) fiber.Handler {
	return func(c fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing Authorization header"})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid Authorization header format"})
		}

		tokenString := parts[1]
		claims, err := jwt_helper.ParseToken(tokenString, cfg.JWTSecret)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired token"})
		}

		c.Locals("user_id", claims.UserID)

		return c.Next()
	}
}
