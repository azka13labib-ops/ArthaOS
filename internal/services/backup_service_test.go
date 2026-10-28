package services

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func TestBackupServiceEncryptionDecryption(t *testing.T) {
	key := "super-secret-backup-passphrase-12345"
	svc, err := NewBackupService(key)
	if err != nil {
		t.Fatalf("unexpected error creating backup service: %v", err)
	}

	payload := []byte("PostgreSQL dump header and binary table data simulation")

	ciphertext, err := svc.Encrypt(payload)
	if err != nil {
		t.Fatalf("encryption failed: %v", err)
	}

	if bytes.Equal(ciphertext, payload) {
		t.Fatalf("ciphertext must not match plaintext")
	}

	plaintext, err := svc.Decrypt(ciphertext)
	if err != nil {
		t.Fatalf("decryption failed: %v", err)
	}

	if !bytes.Equal(plaintext, payload) {
		t.Fatalf("expected decrypted text %q, got %q", payload, plaintext)
	}
}

func TestBackupServiceTamperedCiphertext(t *testing.T) {
	key := "secret-encryption-key-for-test-32bytes"
	svc, err := NewBackupService(key)
	if err != nil {
		t.Fatalf("failed to init backup service: %v", err)
	}

	payload := []byte("important financial database transactions")
	ciphertext, err := svc.Encrypt(payload)
	if err != nil {
		t.Fatalf("failed to encrypt: %v", err)
	}

	// Tamper with the last byte of ciphertext (auth tag)
	ciphertext[len(ciphertext)-1] ^= 0xFF

	_, err = svc.Decrypt(ciphertext)
	if err == nil {
		t.Fatalf("expected decryption error due to authentication failure, got nil")
	}
}

func TestBackupServiceWrongKey(t *testing.T) {
	svc1, _ := NewBackupService("primary-encryption-key-123456789")
	svc2, _ := NewBackupService("different-encryption-key-9876543")

	payload := []byte("confidential sales ledger")
	ciphertext, err := svc1.Encrypt(payload)
	if err != nil {
		t.Fatalf("failed to encrypt: %v", err)
	}

	_, err = svc2.Decrypt(ciphertext)
	if err == nil {
		t.Fatalf("expected decryption error when using wrong key, got nil")
	}
}

func TestBackupServiceList(t *testing.T) {
	svc, err := NewBackupService("test-key-32-bytes-long-string!!")
	if err != nil {
		t.Fatalf("failed to init: %v", err)
	}

	tmpDir := t.TempDir()

	file1 := filepath.Join(tmpDir, "backup_20261028_100000.dump.enc")
	file2 := filepath.Join(tmpDir, "backup_20261028_110000.dump.enc")
	ignoredFile := filepath.Join(tmpDir, "notes.txt")

	if err := os.WriteFile(file1, []byte("data1"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(file2, []byte("data22"), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(ignoredFile, []byte("ignore me"), 0600); err != nil {
		t.Fatal(err)
	}

	list, err := svc.List(tmpDir)
	if err != nil {
		t.Fatalf("failed to list backups: %v", err)
	}

	if len(list) != 2 {
		t.Fatalf("expected 2 backup files, got %d", len(list))
	}
}
