package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"app/internal/handlers"
	"app/internal/models"
	"app/internal/services"
	"github.com/gofiber/fiber/v3"
)

type stubSocialService struct {
	templates []models.PosterTemplate
}

func (s *stubSocialService) GetTemplates() []models.PosterTemplate {
	return []models.PosterTemplate{
		{
			ID:          "promo-deal",
			Name:        "Promo Diskon",
			Category:    "promo",
			AspectRatio: "4:5",
			Width:       1080,
			Height:      1350,
		},
	}
}

func (s *stubSocialService) GetQuota(storeID uint) (*services.SocialQuotaResponse, error) {
	return &services.SocialQuotaResponse{
		Plan:         "free",
		YearMonth:    "2026-11",
		CaptionUsed:  2,
		CaptionLimit: 15,
		CaptionLeft:  13,
		PostUsed:     0,
		PostLimit:    5,
		PostLeft:     5,
		HasBYOK:      false,
	}, nil
}

func (s *stubSocialService) GenerateCaption(ctx context.Context, storeID uint, userID uint, req services.GenerateCaptionRequest) (*services.GenerateCaptionResponse, error) {
	return &services.GenerateCaptionResponse{
		Caption:     "Nikmati kopi susu lezat di warkop kami hari ini!",
		Hashtags:    []string{"#kopisusu", "#warkop", "#promo"},
		Headline:    "Kopi Susu Mantap",
		Subheadline: "Diskon 10% khusus hari ini",
		QuotaLeft:   12,
		IsBYOK:      false,
	}, nil
}

func (s *stubSocialService) RenderPoster(ctx context.Context, storeID uint, req services.RenderPosterRequest) (*services.RenderPosterResponse, error) {
	return &services.RenderPosterResponse{
		URL:        "/uploads/posters/test-poster-uuid.jpg",
		FullURL:    "http://localhost:8080/uploads/posters/test-poster-uuid.jpg",
		Filename:   "test-poster-uuid.jpg",
		TemplateID: req.TemplateID,
		Width:      1080,
		Height:     1350,
		Format:     "jpeg",
		FileSize:   123456,
	}, nil
}

func (s *stubSocialService) SetBYOKKey(storeID uint, apiKey string, provider string) error {
	return nil
}

func TestSocialHandler_GetTemplates(t *testing.T) {
	app := fiber.New()
	stub := &stubSocialService{}
	handler := handlers.NewSocialHandler(stub)

	app.Get("/social/templates", handler.GetTemplates)

	req := httptest.NewRequest("GET", "/social/templates", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestSocialHandler_GenerateCaption(t *testing.T) {
	app := fiber.New()
	stub := &stubSocialService{}
	handler := handlers.NewSocialHandler(stub)

	app.Post("/stores/:storeId/social/captions/generate", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		c.Locals("user_id", uint(42))
		return handler.GenerateCaption(c)
	})

	body := map[string]interface{}{
		"goal":       "promo",
		"tone":       "santai",
		"extra_note": "Promo Jumat Berkah",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/stores/1/social/captions/generate", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}

func TestSocialHandler_RenderPoster(t *testing.T) {
	app := fiber.New()
	stub := &stubSocialService{}
	handler := handlers.NewSocialHandler(stub)

	app.Post("/stores/:storeId/social/posters/render", func(c fiber.Ctx) error {
		c.Locals("store_id", uint(1))
		return handler.RenderPoster(c)
	})

	body := map[string]interface{}{
		"template_id": "promo-deal",
		"headline":    "Flash Sale Hebat",
		"subheadline": "Hanya hari ini",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest("POST", "/stores/1/social/posters/render", bytes.NewReader(bodyBytes))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}
}
