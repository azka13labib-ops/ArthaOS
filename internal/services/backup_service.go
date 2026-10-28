package services

import (
	"bytes"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

type BackupFileInfo struct {
	FileName  string    `json:"filename"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"created_at"`
}

type BackupService interface {
	Create(ctx context.Context, dsn, directory string) (string, error)
	Restore(ctx context.Context, dsn, path string) error
	List(directory string) ([]BackupFileInfo, error)
	Encrypt(plaintext []byte) ([]byte, error)
	Decrypt(ciphertext []byte) ([]byte, error)
}

type backupService struct {
	key []byte
}

func NewBackupService(key string) (BackupService, error) {
	if key == "" {
		return nil, errors.New("BACKUP_ENCRYPTION_KEY cannot be empty")
	}
	// Derive 32-byte AES-256 key deterministically via SHA-256
	h := sha256.Sum256([]byte(key))
	keyBytes := make([]byte, 32)
	copy(keyBytes, h[:])
	return &backupService{key: keyBytes}, nil
}

func (s *backupService) Encrypt(plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.key)
	if err != nil {
		return nil, fmt.Errorf("cipher init error: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("gcm init error: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("nonce generation error: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, plaintext, nil)
	return ciphertext, nil
}

func (s *backupService) Decrypt(ciphertext []byte) ([]byte, error) {
	block, err := aes.NewCipher(s.key)
	if err != nil {
		return nil, fmt.Errorf("cipher init error: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("gcm init error: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return nil, errors.New("ciphertext too short: invalid encrypted backup format")
	}

	nonce := ciphertext[:nonceSize]
	encryptedData := ciphertext[nonceSize:]

	plaintext, err := gcm.Open(nil, nonce, encryptedData, nil)
	if err != nil {
		return nil, fmt.Errorf("backup authentication failed (tampered ciphertext or wrong key): %w", err)
	}
	return plaintext, nil
}

func (s *backupService) Create(ctx context.Context, dsn, directory string) (string, error) {
	if dsn == "" {
		return "", errors.New("database URL is empty")
	}
	if directory == "" {
		directory = "./backups"
	}
	if err := os.MkdirAll(directory, 0700); err != nil {
		return "", fmt.Errorf("failed to create backup directory: %w", err)
	}

	cmd := exec.CommandContext(ctx, "pg_dump", "--format=custom", "--no-owner", "--dbname", dsn)
	var dump bytes.Buffer
	cmd.Stdout = &dump
	var errBuf bytes.Buffer
	cmd.Stderr = &errBuf
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("pg_dump failed: %w: %s", err, errBuf.String())
	}

	ciphertext, err := s.Encrypt(dump.Bytes())
	if err != nil {
		return "", fmt.Errorf("encryption failed: %w", err)
	}

	name := fmt.Sprintf("backup_%s.dump.enc", time.Now().Format("20060102_150405"))
	path := filepath.Join(directory, name)
	if err := os.WriteFile(path, ciphertext, 0600); err != nil {
		return "", fmt.Errorf("failed to write encrypted backup file: %w", err)
	}
	return path, nil
}

func (s *backupService) Restore(ctx context.Context, dsn, path string) error {
	if dsn == "" {
		return errors.New("database URL is empty")
	}

	cleanPath := filepath.Clean(path)
	data, err := os.ReadFile(cleanPath)
	if err != nil {
		return fmt.Errorf("failed to read backup file: %w", err)
	}

	plaintext, err := s.Decrypt(data)
	if err != nil {
		return err
	}

	cmd := exec.CommandContext(ctx, "pg_restore", "--clean", "--if-exists", "--no-owner", "--dbname", dsn)
	cmd.Stdin = bytes.NewReader(plaintext)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("pg_restore failed: %w: %s", err, output)
	}
	return nil
}

func (s *backupService) List(directory string) ([]BackupFileInfo, error) {
	if directory == "" {
		directory = "./backups"
	}
	entries, err := os.ReadDir(directory)
	if err != nil {
		if os.IsNotExist(err) {
			return []BackupFileInfo{}, nil
		}
		return nil, err
	}

	var results []BackupFileInfo
	for _, entry := range entries {
		if entry.IsDir() || filepath.Ext(entry.Name()) != ".enc" {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		results = append(results, BackupFileInfo{
			FileName:  entry.Name(),
			Size:      info.Size(),
			CreatedAt: info.ModTime(),
		})
	}
	return results, nil
}
