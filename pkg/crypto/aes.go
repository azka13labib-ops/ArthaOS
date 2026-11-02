package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

// Encrypt encrypts plaintext bytes with AES-256-GCM using a key derived from secretKey.
// The result is returned as a base64-encoded string containing [nonce + ciphertext].
func Encrypt(secretKey string, plaintext []byte) (string, error) {
	if secretKey == "" {
		return "", errors.New("secretKey cannot be empty")
	}

	h := sha256.Sum256([]byte(secretKey))
	block, err := aes.NewCipher(h[:])
	if err != nil {
		return "", fmt.Errorf("cipher init error: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("gcm init error: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("nonce generation error: %w", err)
	}

	sealed := gcm.Seal(nonce, nonce, plaintext, nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// Decrypt decrypts a base64-encoded [nonce + ciphertext] string using secretKey.
func Decrypt(secretKey string, encodedCiphertext string) ([]byte, error) {
	if secretKey == "" {
		return nil, errors.New("secretKey cannot be empty")
	}

	data, err := base64.StdEncoding.DecodeString(encodedCiphertext)
	if err != nil {
		return nil, fmt.Errorf("base64 decode error: %w", err)
	}

	h := sha256.Sum256([]byte(secretKey))
	block, err := aes.NewCipher(h[:])
	if err != nil {
		return nil, fmt.Errorf("cipher init error: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("gcm init error: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return nil, errors.New("ciphertext too short: invalid encrypted payload")
	}

	nonce := data[:nonceSize]
	ciphertext := data[nonceSize:]

	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, fmt.Errorf("decryption failed (invalid key or corrupted data): %w", err)
	}

	return plaintext, nil
}

