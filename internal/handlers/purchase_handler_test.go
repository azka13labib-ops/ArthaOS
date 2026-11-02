package handlers_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"app/internal/handlers"
	"app/internal/models"
	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

type stubPurchaseService struct {
	createdPurchase *models.Purchase
	createdPayment  *models.SupplierPayment
	payments        []models.SupplierPayment
	err             error
}

func (s *stubPurchaseService) Create(storeID uint, req services.CreatePurchaseRequest) (*models.Purchase, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.createdPurchase, nil
}

func (s *stubPurchaseService) List(storeID uint, limit, offset int) ([]models.Purchase, int64, error) {
	if s.err != nil {
		return nil, 0, s.err
	}
	return nil, 0, nil
}

func (s *stubPurchaseService) GetByID(id uint, storeID uint) (*models.Purchase, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.createdPurchase, nil
}

func (s *stubPurchaseService) AddPayment(storeID uint, purchaseID uint, req services.CreateSupplierPaymentRequest) (*models.SupplierPayment, error) {
	if s.err != nil {
		return nil, s.err
	}
	if req.Amount <= 0 {
		return nil, errors.New("nominal pembayaran harus lebih dari 0")
	}
	return &models.SupplierPayment{
		ID:            101,
		StoreID:       storeID,
		PurchaseID:    purchaseID,
		Amount:        req.Amount,
		PaymentMethod: req.PaymentMethod,
		PaymentDate:   time.Now(),
		Notes:         req.Notes,
	}, nil
}

func (s *stubPurchaseService) GetPayments(storeID uint, purchaseID uint) ([]models.SupplierPayment, error) {
	if s.err != nil {
		return nil, s.err
	}
	return s.payments, nil
}

func TestPurchaseHandler_AddPayment_Success(t *testing.T) {
	app := fiber.New()
	stub := &stubPurchaseService{}
	h := handlers.NewPurchaseHandler(stub)

	app.Post("/purchases/:id/payments", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		return h.AddPayment(c)
	})

	body := []byte(`{"amount": 500000, "payment_method": "transfer", "notes": "Cicilan 1"}`)
	req := httptest.NewRequest(http.MethodPost, "/purchases/10/payments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", resp.StatusCode)
	}

	var payment models.SupplierPayment
	if err := json.NewDecoder(resp.Body).Decode(&payment); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if payment.Amount != 500000 {
		t.Errorf("expected amount 500000, got %d", payment.Amount)
	}
	if payment.PurchaseID != 10 {
		t.Errorf("expected purchase_id 10, got %d", payment.PurchaseID)
	}
}

func TestPurchaseHandler_AddPayment_InvalidAmount(t *testing.T) {
	app := fiber.New()
	stub := &stubPurchaseService{}
	h := handlers.NewPurchaseHandler(stub)

	app.Post("/purchases/:id/payments", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		return h.AddPayment(c)
	})

	body := []byte(`{"amount": 0, "payment_method": "cash"}`)
	req := httptest.NewRequest(http.MethodPost, "/purchases/10/payments", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected status 400 for amount 0, got %d", resp.StatusCode)
	}
}

func TestPurchaseHandler_GetPayments(t *testing.T) {
	app := fiber.New()
	stub := &stubPurchaseService{
		payments: []models.SupplierPayment{
			{ID: 1, Amount: 400000, PaymentMethod: "transfer"},
			{ID: 2, Amount: 600000, PaymentMethod: "cash"},
		},
	}
	h := handlers.NewPurchaseHandler(stub)

	app.Get("/purchases/:id/payments", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		return h.GetPayments(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/purchases/10/payments", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var res struct {
		Data []models.SupplierPayment `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(res.Data) != 2 {
		t.Errorf("expected 2 payments, got %d", len(res.Data))
	}
}
