package handlers

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"

	"app/internal/services"
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
