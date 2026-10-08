package main

import (
	"app/internal/config"
	"app/internal/database"
	"app/internal/middleware"
	"app/internal/routes"
	"log"

	"github.com/gofiber/fiber/v3"
)

func main() {

	cfg := config.LoadConfig()

	database.ConnectDB(cfg.DatabaseURL)

	app := fiber.New(fiber.Config{
		ReadBufferSize:  64 * 1024,
		WriteBufferSize: 64 * 1024,
		ErrorHandler: func(c fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}

			msg := "An internal error occurred"
			if !cfg.IsProduction() {
				msg = err.Error()
			}
			return c.Status(code).JSON(fiber.Map{
				"error": msg,
				"code":  "INTERNAL_ERROR",
			})
		},
	})

	app.Use(middleware.SecurityHeaders())

	app.Use(middleware.CORS(cfg.AllowedOrigins))

	app.Use(middleware.RequestLogger())

	app.Use(middleware.PreventPathTraversal())

	app.Use(middleware.RateLimitAPI())

	app.Get("/", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "version": "2.3.0"})
	})

	routes.SetupRoutes(app, database.DB, cfg)

	port := cfg.Port
	if port == "" {
		port = "3000"
	}

	log.Printf(" Server starting on port %s [env=%s]", port, cfg.AppEnv)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
