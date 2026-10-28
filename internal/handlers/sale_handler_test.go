package handlers_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"app/internal/handlers"
	"app/internal/models"
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type stubSaleService struct {
	voidTrx *models.Transaction
	voidErr error
}

func (s *stubSaleService) CreateSale(storeID uint, req services.SaleRequest) (*models.Transaction, error) {
	return nil, nil
}

func (s *stubSaleService) GetSales(storeID uint, limit, offset int) ([]models.Transaction, error) {
	return nil, nil
}

func (s *stubSaleService) VoidSale(storeID uint, transactionID uint, authorizedByID uint, reason string) (*models.Transaction, error) {
	if s.voidErr != nil {
		return nil, s.voidErr
	}
	if s.voidTrx != nil {
		return s.voidTrx, nil
	}
	return &models.Transaction{
		ID:          transactionID,
		StoreID:     storeID,
		Type:        "sale",
		Status:      "voided",
		TotalAmount: 75000,
	}, nil
}

func TestSaleHandlerVoid_RequiresReason(t *testing.T) {
	app := fiber.New()
	saleSvc := &stubSaleService{}
	handler := handlers.NewSaleHandler(saleSvc)

	app.Post("/sales/:id/void", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		c.Locals("user_id", uint(2))
		return handler.Void(c)
	})

	body := []byte(`{"reason": ""}`)
	req := httptest.NewRequest(http.MethodPost, "/sales/10/void", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request when reason is empty, got %d", resp.StatusCode)
	}
}

func TestSaleHandlerVoid_Success(t *testing.T) {
	app := fiber.New()
	saleSvc := &stubSaleService{}
	handler := handlers.NewSaleHandler(saleSvc)

	app.Post("/sales/:id/void", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		c.Locals("user_id", uint(2))
		return handler.Void(c)
	})

	body := []byte(`{"reason": "Customer returned unopened items"}`)
	req := httptest.NewRequest(http.MethodPost, "/sales/42/void", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK on successful void, got %d", resp.StatusCode)
	}

	var res map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	trx, ok := res["transaction"].(map[string]interface{})
	if !ok {
		t.Fatalf("response missing 'transaction' object")
	}

	if trx["status"] != "voided" {
		t.Errorf("expected transaction status 'voided', got %v", trx["status"])
	}
}

func TestSaleHandlerVoid_AlreadyVoided_ReturnsError(t *testing.T) {
	app := fiber.New()
	saleSvc := &stubSaleService{
		voidErr: errors.New("transaksi sudah pernah di-void"),
	}
	handler := handlers.NewSaleHandler(saleSvc)

	app.Post("/sales/:id/void", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		c.Locals("user_id", uint(2))
		return handler.Void(c)
	})

	body := []byte(`{"reason": "Salah input"}`)
	req := httptest.NewRequest(http.MethodPost, "/sales/42/void", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("expected 400 Bad Request for already-voided sale, got %d", resp.StatusCode)
	}
}
