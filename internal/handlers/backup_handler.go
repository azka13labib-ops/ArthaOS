package handlers

import (
	"fmt"
	"path/filepath"
	"strings"

	"app/internal/config"
	"app/internal/repository"
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type BackupHandler struct {
	backupService services.BackupService
	cfg           config.Config
	auditRepo     repository.AuditRepository
	db            *gorm.DB
}

func NewBackupHandler(backupService services.BackupService, cfg config.Config, auditRepo repository.AuditRepository, db *gorm.DB) *BackupHandler {
	return &BackupHandler{
		backupService: backupService,
		cfg:           cfg,
		auditRepo:     auditRepo,
		db:            db,
	}
}

type RestoreRequest struct {
	FileName string `json:"filename" validate:"required"`
}

// Create godoc — POST /api/v1/stores/:storeId/admin/backups
func (h *BackupHandler) Create(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}
	userID, _ := c.Locals("user_id").(uint)

	backupDir := h.cfg.BackupDir
	if backupDir == "" {
		backupDir = "./backups"
	}

	path, err := h.backupService.Create(c.Context(), h.cfg.DatabaseURL, backupDir)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("Failed to create backup: %v", err),
			"code":  "BACKUP_FAILED",
		})
	}

	go func() {
		meta := fmt.Sprintf(`{"actor_id":%d,"backup_file":%q}`, userID, filepath.Base(path))
		_ = h.auditRepo.Log(h.db, storeID, "user", "create_backup", "backup", 0, &meta)
	}()

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":  "Encrypted backup created successfully",
		"filename": filepath.Base(path),
		"path":     path,
	})
}

// List godoc — GET /api/v1/stores/:storeId/admin/backups
func (h *BackupHandler) List(c fiber.Ctx) error {
	backupDir := h.cfg.BackupDir
	if backupDir == "" {
		backupDir = "./backups"
	}

	backups, err := h.backupService.List(backupDir)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to list backups",
			"code":  "LIST_BACKUPS_FAILED",
		})
	}

	return c.JSON(fiber.Map{
		"backups": backups,
	})
}

// Restore godoc — POST /api/v1/stores/:storeId/admin/backups/restore
func (h *BackupHandler) Restore(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized", "code": "UNAUTHORIZED"})
	}
	userID, _ := c.Locals("user_id").(uint)

	var req RestoreRequest
	if err := c.Bind().Body(&req); err != nil || req.FileName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Field 'filename' is required",
			"code":  "INVALID_REQUEST",
		})
	}

	// Strictly prevent directory traversal attacks
	cleanName := filepath.Base(filepath.Clean(req.FileName))
	if cleanName != req.FileName || !strings.HasSuffix(cleanName, ".dump.enc") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid backup file name",
			"code":  "INVALID_FILENAME",
		})
	}

	backupDir := h.cfg.BackupDir
	if backupDir == "" {
		backupDir = "./backups"
	}
	targetPath := filepath.Join(backupDir, cleanName)

	if err := h.backupService.Restore(c.Context(), h.cfg.DatabaseURL, targetPath); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("Restore failed: %v", err),
			"code":  "RESTORE_FAILED",
		})
	}

	go func() {
		meta := fmt.Sprintf(`{"actor_id":%d,"restored_file":%q}`, userID, cleanName)
		_ = h.auditRepo.Log(h.db, storeID, "user", "restore_backup", "backup", 0, &meta)
	}()

	return c.JSON(fiber.Map{
		"message":  "Database restored successfully from encrypted backup",
		"filename": cleanName,
	})
}
