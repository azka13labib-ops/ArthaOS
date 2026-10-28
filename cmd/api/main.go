package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"app/internal/config"
	"app/internal/database"
	"app/internal/middleware"
	"app/internal/routes"
	"app/internal/services"
	"app/internal/worker"

	"github.com/gofiber/fiber/v3"
)

func main() {
	cfg := config.LoadConfig()

	database.ConnectDB(cfg.DatabaseURL)

	// In-process Go worker pool without external Redis dependency
	workerPool := worker.NewPool(4, 100)
	scheduler := worker.NewScheduler()

	// Daily encrypted backup scheduler (AES-256-GCM)
	if cfg.BackupEncryptionKey != "" && cfg.DatabaseURL != "" {
		backupDir := cfg.BackupDir
		if backupDir == "" {
			backupDir = "./backups"
		}
		backupSvc, err := services.NewBackupService(cfg.BackupEncryptionKey)
		if err == nil {
			log.Printf(" Encrypted backup scheduler initialized (dir=%s, interval=24h)", backupDir)
			scheduler.Every(24*time.Hour, func() {
				ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
				defer cancel()
				log.Println("[BACKUP SCHEDULER] Running daily encrypted backup...")
				path, err := backupSvc.Create(ctx, cfg.DatabaseURL, backupDir)
				if err != nil {
					log.Printf("[BACKUP SCHEDULER ERROR] Daily backup failed: %v", err)
				} else {
					log.Printf("[BACKUP SCHEDULER SUCCESS] Backup created at: %s", path)
				}
			})
		} else {
			log.Printf(" Backup service initialization skipped: %v", err)
		}
	}

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

	routes.SetupRoutes(app, database.DB, cfg, workerPool)

	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	// Trap OS interrupt signals for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf(" Server starting on port %s [env=%s]", port, cfg.AppEnv)
		if err := app.Listen(":" + port); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	<-quit
	log.Println(" Shutting down server gracefully...")

	if err := app.Shutdown(); err != nil {
		log.Printf("Error during Fiber shutdown: %v", err)
	}

	log.Println(" Stopping background scheduler...")
	scheduler.Stop()

	log.Println(" Draining and stopping worker pool...")
	workerPool.Shutdown()

	log.Println(" Shutdown complete.")
}
