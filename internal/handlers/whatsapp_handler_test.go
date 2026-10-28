package handlers

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"app/internal/services"

	"github.com/gofiber/fiber/v3"
)

func TestVerifyHMACSignature(t *testing.T) {
	secret := "my-secret-webhook-key-12345"
	handler := NewWhatsAppHandler(services.NewNLPService(), secret)

	body := []byte(`{"message":"penjualan 50000"}`)

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	validSig := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	if !handler.verifyHMACSignature(body, validSig) {
		t.Error("Expected valid signature to verify successfully")
	}

	invalidSig := "sha256=abcdef1234567890abcdef1234567890"
	if handler.verifyHMACSignature(body, invalidSig) {
		t.Error("Expected invalid signature to fail verification")
	}

	rawHex := hex.EncodeToString(mac.Sum(nil))
	if handler.verifyHMACSignature(body, rawHex) {
		t.Error("Expected header without sha256= prefix to fail verification")
	}

	tamperedBody := []byte(`{"message":"penjualan 999999999"}`)
	if handler.verifyHMACSignature(tamperedBody, validSig) {
		t.Error("Expected tampered body to fail verification")
	}
}

func TestWebhook_ReplayProtection(t *testing.T) {
	secret := "my-secret-webhook-key-12345"
	handler := NewWhatsAppHandler(services.NewNLPService(), secret)

	app := fiber.New()
	app.Post("/webhook", handler.Webhook)

	body := []byte(`{"id":"evt_123456","message":"halo"}`)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	sig := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	// First call -> 200 OK
	req := httptest.NewRequest("POST", "/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Hub-Signature-256", sig)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Request 1 failed: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected 200 OK on first request, got %d", resp.StatusCode)
	}

	// Replay call with exact same body & sig -> 409 Conflict (Replay detected)
	req2 := httptest.NewRequest("POST", "/webhook", bytes.NewReader(body))
	req2.Header.Set("Content-Type", "application/json")
	req2.Header.Set("X-Hub-Signature-256", sig)

	resp2, err := app.Test(req2)
	if err != nil {
		t.Fatalf("Request 2 failed: %v", err)
	}
	if resp2.StatusCode != http.StatusConflict {
		t.Errorf("Expected 409 Conflict on replay request, got %d", resp2.StatusCode)
	}
}

func TestWebhook_ExpiredTimestamp(t *testing.T) {
	secret := "my-secret-webhook-key-12345"
	handler := NewWhatsAppHandler(services.NewNLPService(), secret)

	app := fiber.New()
	app.Post("/webhook", handler.Webhook)

	// Body with expired timestamp (10 minutes ago)
	expiredTs := time.Now().Add(-10 * time.Minute).Unix()
	body := []byte(fmt.Sprintf(`{"id":"evt_old_1","timestamp":%d,"message":"halo"}`, expiredTs))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	sig := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	req := httptest.NewRequest("POST", "/webhook", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Hub-Signature-256", sig)

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	if resp.StatusCode != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request on expired timestamp, got %d", resp.StatusCode)
	}
}
