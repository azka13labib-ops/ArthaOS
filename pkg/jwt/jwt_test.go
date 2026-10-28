package jwt_helper

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestGenerateAndParseToken(t *testing.T) {
	secret := "a-very-long-and-secure-test-jwt-secret-key-32-chars"
	userID := uint(42)

	token, err := GenerateToken(userID, secret)
	if err != nil {
		t.Fatalf("Failed to generate token: %v", err)
	}

	claims, err := ParseToken(token, secret)
	if err != nil {
		t.Fatalf("Failed to parse valid token: %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("Expected UserID %d, got %d", userID, claims.UserID)
	}
}

func TestParseToken_InvalidSecret(t *testing.T) {
	secret1 := "a-very-long-and-secure-test-jwt-secret-key-32-chars"
	secret2 := "wrong-secret-key-that-does-not-match-at-all-32-chars"

	token, _ := GenerateToken(10, secret1)
	_, err := ParseToken(token, secret2)
	if err == nil {
		t.Error("Expected error when parsing with wrong secret, got nil")
	}
}

func TestParseToken_ExpiredToken(t *testing.T) {
	secret := "a-very-long-and-secure-test-jwt-secret-key-32-chars"
	claims := CustomClaims{
		UserID: 10,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}
	expiredToken, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))

	_, err := ParseToken(expiredToken, secret)
	if err == nil {
		t.Error("Expected error when parsing expired token, got nil")
	}
}

func TestParseToken_MalformedToken(t *testing.T) {
	secret := "a-very-long-and-secure-test-jwt-secret-key-32-chars"
	malformed := "not.a.valid.jwt.token"

	_, err := ParseToken(malformed, secret)
	if err == nil {
		t.Error("Expected error when parsing malformed token, got nil")
	}
}

func TestParseToken_RejectNonHS256(t *testing.T) {
	secret := "a-very-long-and-secure-test-jwt-secret-key-32-chars"
	claims := CustomClaims{
		UserID: 10,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	// Token signed with HS384 instead of HS256
	tokenHS384, err := jwt.NewWithClaims(jwt.SigningMethodHS384, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("Failed to sign HS384 token: %v", err)
	}

	_, err = ParseToken(tokenHS384, secret)
	if err == nil {
		t.Error("Expected error when parsing non-HS256 (HS384) token, got nil")
	}

	// Token signed with HS512
	tokenHS512, err := jwt.NewWithClaims(jwt.SigningMethodHS512, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("Failed to sign HS512 token: %v", err)
	}

	_, err = ParseToken(tokenHS512, secret)
	if err == nil {
		t.Error("Expected error when parsing non-HS256 (HS512) token, got nil")
	}

	// Token signed with None (alg: none)
	tokenNone, err := jwt.NewWithClaims(jwt.SigningMethodNone, claims).SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatalf("Failed to sign none token: %v", err)
	}

	_, err = ParseToken(tokenNone, secret)
	if err == nil {
		t.Error("Expected error when parsing none algorithm token, got nil")
	}
}
