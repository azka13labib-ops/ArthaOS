package crypto_test

import (
	"app/pkg/crypto"
	"testing"
)

func TestEncryptDecrypt(t *testing.T) {
	key := "my-very-secure-secret-encryption-key-12345"
	original := "EAABsb1234MetaAccessTokenForInstagramTesting"

	encrypted, err := crypto.Encrypt(key, []byte(original))
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	if encrypted == original {
		t.Fatalf("Ciphertext should not match original plaintext")
	}

	decrypted, err := crypto.Decrypt(key, encrypted)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if string(decrypted) != original {
		t.Fatalf("Expected %s, got %s", original, string(decrypted))
	}
}

func TestDecryptWithWrongKey(t *testing.T) {
	key1 := "key-number-1"
	key2 := "key-number-2"
	original := "sensitive-token"

	encrypted, err := crypto.Encrypt(key1, []byte(original))
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	_, err = crypto.Decrypt(key2, encrypted)
	if err == nil {
		t.Fatalf("Expected decryption with wrong key to fail, but succeeded")
	}
}
