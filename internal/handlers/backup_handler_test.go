package handlers_test

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"app/internal/config"
	"app/internal/handlers"
	"app/internal/repository"
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type stubBackupService struct {
	listResult []services.BackupFileInfo
	restoreErr error
}

func (s *stubBackupService) Create(ctx context.Context, dsn, directory string) (string, error) {
	return "/backups/backup_test.dump.enc", nil
}

func (s *stubBackupService) Restore(ctx context.Context, dsn, path string) error {
	return s.restoreErr
}

func (s *stubBackupService) List(directory string) ([]services.BackupFileInfo, error) {
	return s.listResult, nil
}

func (s *stubBackupService) Encrypt(plaintext []byte) ([]byte, error) {
	return plaintext, nil
}

func (s *stubBackupService) Decrypt(ciphertext []byte) ([]byte, error) {
	return ciphertext, nil
}

func TestBackupHandlerRestore_RejectsPathTraversal(t *testing.T) {
	app := fiber.New()
	backupSvc := &stubBackupService{}
	cfg := config.Config{BackupDir: "./backups"}
	handler := handlers.NewBackupHandler(backupSvc, cfg, repository.NewAuditRepository(), nil)

	app.Post("/backups/restore", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		c.Locals("user_id", uint(1))
		return handler.Restore(c)
	})

	maliciousPayloads := []string{
		`{"filename": "../../etc/passwd"}`,
		`{"filename": "..\\..\\windows\\system32"}`,
		`{"filename": "/etc/shadow"}`,
		`{"filename": "backup.sql"}`, // Missing .dump.enc extension
		`{"filename": "normal.txt"}`,
	}

	for _, payload := range maliciousPayloads {
		req := httptest.NewRequest(http.MethodPost, "/backups/restore", bytes.NewReader([]byte(payload)))
		req.Header.Set("Content-Type", "application/json")

		resp, err := app.Test(req)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}

		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request for malicious or invalid payload %q, got %d", payload, resp.StatusCode)
		}
	}
}

func TestBackupHandlerList_Success(t *testing.T) {
	app := fiber.New()
	backupSvc := &stubBackupService{
		listResult: []services.BackupFileInfo{
			{FileName: "backup_20261028_100000.dump.enc", Size: 1024, CreatedAt: time.Now()},
		},
	}
	cfg := config.Config{BackupDir: "./backups"}
	handler := handlers.NewBackupHandler(backupSvc, cfg, repository.NewAuditRepository(), nil)

	app.Get("/backups", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		return handler.List(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/backups", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200 OK, got %d", resp.StatusCode)
	}
}
