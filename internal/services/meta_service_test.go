package services_test

import (
	"net/url"
	"strings"
	"testing"

	"app/internal/services"
)

func TestMetaService_GenerateAndValidateAuthURL(t *testing.T) {
	appID := "123456789012345"
	appSecret := "test_secret_abcdef123456"
	redirectURI := "http://localhost:8080/api/v1/social/accounts/callback"
	encKey := "test-social-encryption-key-32ch!"

	svc := services.NewMetaService(appID, appSecret, redirectURI, encKey)

	storeID := uint(10)
	userID := uint(99)

	authURL, err := svc.GenerateAuthURL(storeID, userID)
	if err != nil {
		t.Fatalf("GenerateAuthURL failed: %v", err)
	}

	if !strings.Contains(authURL, services.MetaGraphAPIVersion) {
		t.Errorf("Expected URL to contain Meta Graph API version %s, got: %s", services.MetaGraphAPIVersion, authURL)
	}
	if !strings.Contains(authURL, "client_id="+appID) {
		t.Errorf("Expected URL to contain client_id, got: %s", authURL)
	}

	parsedURL, err := url.Parse(authURL)
	if err != nil {
		t.Fatalf("Failed to parse generated auth URL: %v", err)
	}

	stateParam := parsedURL.Query().Get("state")
	if stateParam == "" {
		t.Fatalf("state parameter not found in generated URL: %s", authURL)
	}

	validStoreID, validUserID, err := svc.ValidateState(stateParam)
	if err != nil {
		t.Fatalf("ValidateState failed: %v", err)
	}

	if validStoreID != storeID || validUserID != userID {
		t.Errorf("Expected storeID=%d, userID=%d, got storeID=%d, userID=%d", storeID, userID, validStoreID, validUserID)
	}
}

func TestMetaService_ValidateStateRejectsTampered(t *testing.T) {
	svc := services.NewMetaService("id", "secret", "uri", "encKey")

	_, _, err := svc.ValidateState("invalid-state-string")
	if err == nil {
		t.Fatalf("Expected ValidateState to reject tampered state, but got nil")
	}
}
