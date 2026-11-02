package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"app/pkg/crypto"
	"github.com/google/uuid"
)

// MetaGraphAPIVersion defines the official pinned version of Meta Graph API used in ArthaOS.
const MetaGraphAPIVersion = "v21.0"

type MetaService interface {
	GenerateAuthURL(storeID uint, userID uint) (string, error)
	ValidateState(stateStr string) (storeID uint, userID uint, err error)
	ExchangeCodeForToken(ctx context.Context, code string) (longLivedToken string, expiresIn int, err error)
	GetInstagramAccount(ctx context.Context, accessToken string) (accountID string, username string, err error)
	RefreshToken(ctx context.Context, existingToken string) (newToken string, expiresIn int, err error)
}

type metaService struct {
	appID         string
	appSecret     string
	redirectURI   string
	encryptionKey string
	client        *http.Client
}

func NewMetaService(appID, appSecret, redirectURI, encryptionKey string) MetaService {
	return &metaService{
		appID:         appID,
		appSecret:     appSecret,
		redirectURI:   redirectURI,
		encryptionKey: encryptionKey,
		client:        &http.Client{Timeout: 15 * time.Second},
	}
}

type OAuthStatePayload struct {
	StoreID   uint   `json:"store_id"`
	UserID    uint   `json:"user_id"`
	Timestamp int64  `json:"ts"`
	Nonce     string `json:"nonce"`
}

func (s *metaService) GenerateAuthURL(storeID uint, userID uint) (string, error) {
	if s.appID == "" || s.redirectURI == "" {
		return "", errors.New("META_APP_ID atau META_REDIRECT_URI belum dikonfigurasi di server")
	}

	statePayload := OAuthStatePayload{
		StoreID:   storeID,
		UserID:    userID,
		Timestamp: time.Now().Unix(),
		Nonce:     uuid.New().String(),
	}

	stateBytes, err := json.Marshal(statePayload)
	if err != nil {
		return "", err
	}

	encKey := s.encryptionKey
	if encKey == "" {
		encKey = "artha-social-secret-key-32chars!"
	}

	encryptedState, err := crypto.Encrypt(encKey, stateBytes)
	if err != nil {
		return "", fmt.Errorf("gagal mengenkripsi OAuth state: %w", err)
	}

	scopes := "instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement"
	authURL := fmt.Sprintf(
		"https://www.facebook.com/%s/dialog/oauth?client_id=%s&redirect_uri=%s&scope=%s&response_type=code&state=%s",
		MetaGraphAPIVersion,
		url.QueryEscape(s.appID),
		url.QueryEscape(s.redirectURI),
		url.QueryEscape(scopes),
		url.QueryEscape(encryptedState),
	)

	return authURL, nil
}

func (s *metaService) ValidateState(stateStr string) (uint, uint, error) {
	encKey := s.encryptionKey
	if encKey == "" {
		encKey = "artha-social-secret-key-32chars!"
	}

	decryptedBytes, err := crypto.Decrypt(encKey, stateStr)
	if err != nil {
		return 0, 0, errors.New("state parameter tidak valid atau rusak (anti-CSRF gagal)")
	}

	var payload OAuthStatePayload
	if err := json.Unmarshal(decryptedBytes, &payload); err != nil {
		return 0, 0, errors.New("format payload state tidak valid")
	}

	// Reject if state is older than 15 minutes (prevent replay attacks)
	if time.Now().Unix()-payload.Timestamp > 900 {
		return 0, 0, errors.New("sesi otorisasi telah kedaluwarsa (lebih dari 15 menit). Silakan coba lagi")
	}

	return payload.StoreID, payload.UserID, nil
}

func (s *metaService) ExchangeCodeForToken(ctx context.Context, code string) (string, int, error) {
	if s.appID == "" || s.appSecret == "" {
		return "", 0, errors.New("META_APP_ID atau META_APP_SECRET belum dikonfigurasi di server")
	}

	// 1. Exchange authorization code for short-lived user token
	tokenEndpoint := fmt.Sprintf("https://graph.facebook.com/%s/oauth/access_token", MetaGraphAPIVersion)
	params := url.Values{}
	params.Set("client_id", s.appID)
	params.Set("client_secret", s.appSecret)
	params.Set("redirect_uri", s.redirectURI)
	params.Set("code", code)

	req, err := http.NewRequestWithContext(ctx, "POST", tokenEndpoint, strings.NewReader(params.Encode()))
	if err != nil {
		return "", 0, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.client.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("gagal menghubungi Meta API: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("gagal menukar kode akses Meta (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var shortLivedResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(bodyBytes, &shortLivedResp); err != nil || shortLivedResp.AccessToken == "" {
		return "", 0, errors.New("gagal membaca access token dari respons Meta")
	}

	// 2. Exchange short-lived token for 60-day long-lived token
	return s.exchangeForLongLived(ctx, shortLivedResp.AccessToken)
}

func (s *metaService) exchangeForLongLived(ctx context.Context, shortLivedToken string) (string, int, error) {
	exchangeURL := fmt.Sprintf(
		"https://graph.facebook.com/%s/oauth/access_token?grant_type=fb_exchange_token&client_id=%s&client_secret=%s&fb_exchange_token=%s",
		MetaGraphAPIVersion,
		url.QueryEscape(s.appID),
		url.QueryEscape(s.appSecret),
		url.QueryEscape(shortLivedToken),
	)

	req, err := http.NewRequestWithContext(ctx, "GET", exchangeURL, nil)
	if err != nil {
		return "", 0, err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("gagal menukar ke token jangka panjang: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("meta API exchange error (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var longLivedResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"` // Usually around 5184000 (60 days)
	}
	if err := json.Unmarshal(bodyBytes, &longLivedResp); err != nil || longLivedResp.AccessToken == "" {
		return "", 0, errors.New("respons long-lived token Meta tidak valid")
	}

	if longLivedResp.ExpiresIn == 0 {
		longLivedResp.ExpiresIn = 60 * 24 * 3600 // Default to 60 days
	}

	return longLivedResp.AccessToken, longLivedResp.ExpiresIn, nil
}

func (s *metaService) GetInstagramAccount(ctx context.Context, accessToken string) (string, string, error) {
	// Query user's connected Facebook Pages and their associated Instagram Business Accounts
	pagesURL := fmt.Sprintf(
		"https://graph.facebook.com/%s/me/accounts?fields=id,name,instagram_business_account{id,username,name}&access_token=%s",
		MetaGraphAPIVersion,
		url.QueryEscape(accessToken),
	)

	req, err := http.NewRequestWithContext(ctx, "GET", pagesURL, nil)
	if err != nil {
		return "", "", err
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("gagal membaca akun dari Meta: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("gagal mengambil profil Meta (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var pagesResp struct {
		Data []struct {
			ID                       string `json:"id"`
			Name                     string `json:"name"`
			InstagramBusinessAccount *struct {
				ID       string `json:"id"`
				Username string `json:"username"`
			} `json:"instagram_business_account"`
		} `json:"data"`
	}

	if err := json.Unmarshal(bodyBytes, &pagesResp); err != nil {
		return "", "", errors.New("format respons akun Meta tidak dapat dibaca")
	}

	for _, page := range pagesResp.Data {
		if page.InstagramBusinessAccount != nil && page.InstagramBusinessAccount.ID != "" {
			return page.InstagramBusinessAccount.ID, page.InstagramBusinessAccount.Username, nil
		}
	}

	return "", "", errors.New("tidak ditemukan akun Instagram Business/Creator yang terhubung ke Halaman Facebook Anda. Silakan pastikan akun Instagram telah dialihkan ke jenis Bisnis/Kreator dan dihubungkan ke Halaman Facebook")
}

func (s *metaService) RefreshToken(ctx context.Context, existingToken string) (string, int, error) {
	return s.exchangeForLongLived(ctx, existingToken)
}
